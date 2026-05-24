/**
 * Post-write pipeline for harness lens.
 *
 * The ultimate-pi harness keeps lens focused on edit safety, formatting, LSP sync,
 * and secret blocking.
 */

import * as nodeFs from "node:fs";
import * as path from "node:path";
import { detectFileKind, getFileKindLabel } from "./file-kinds.js";
import type { FormatService } from "./format-service.js";
import { logLatency } from "./latency-logger.js";
import { emitLensAnalysisComplete } from "./lens-events.js";
import { getLSPService } from "./lsp/index.js";
import { RUNTIME_CONFIG } from "./runtime-config.js";
import { formatSecrets, scanForSecrets } from "./secrets-scanner.js";

const LSP_MAX_FILE_BYTES = RUNTIME_CONFIG.pipeline.lspMaxFileBytes;
const LSP_MAX_FILE_LINES = RUNTIME_CONFIG.pipeline.lspMaxFileLines;
const LSP_SPAWN_BUDGET_MS = RUNTIME_CONFIG.pipeline.lspSpawnBudgetMs;

export interface PipelineContext {
	filePath: string;
	cwd: string;
	toolName: string;
	modifiedRanges?: { start: number; end: number }[];
	telemetry?: {
		model: string;
		sessionId: string;
		turnIndex: number;
		writeIndex: number;
	};
	getFlag: (name: string) => boolean | string | undefined;
	dbg: (msg: string) => void;
}

export interface PipelineDeps {
	getFormatService: () => FormatService;
}

export interface PipelineResult {
	output: string;
	hasBlockers: boolean;
	isError: boolean;
	fileModified: boolean;
	changedFiles?: string[];
}

interface PhaseTracker {
	start(name: string): void;
	end(name: string, metadata?: Record<string, unknown>): void;
}

type SecretDiagnostic = {
	id: string;
	message: string;
	filePath: string;
	line: number;
	column: number;
	severity: "error";
	semantic: "blocking";
	tool: "secrets-scanner";
	rule: "secrets";
	defectClass: "secrets";
};

function createPhaseTracker(toolName: string, filePath: string): PhaseTracker {
	const phases: Array<{ name: string; startTime: number; ended: boolean }> = [];
	return {
		start(name: string) {
			phases.push({ name, startTime: Date.now(), ended: false });
		},
		end(name: string, metadata?: Record<string, unknown>) {
			const phase = phases.find((item) => item.name === name && !item.ended);
			if (!phase) return;
			phase.ended = true;
			logLatency({
				type: "phase",
				toolName,
				filePath,
				phase: name,
				durationMs: Date.now() - phase.startTime,
				metadata,
			});
		},
	};
}

function exceedsLspSyncLimits(content: string): {
	tooLarge: boolean;
	reason: string;
} {
	const sizeBytes = Buffer.byteLength(content, "utf-8");
	if (sizeBytes > LSP_MAX_FILE_BYTES) {
		return {
			tooLarge: true,
			reason: `${Math.round(sizeBytes / 1024)}KB exceeds ${Math.round(LSP_MAX_FILE_BYTES / 1024)}KB`,
		};
	}

	const lineCount = content.split("\n").length;
	if (lineCount > LSP_MAX_FILE_LINES) {
		return {
			tooLarge: true,
			reason: `${lineCount} lines exceeds ${LSP_MAX_FILE_LINES}`,
		};
	}

	return { tooLarge: false, reason: "" };
}

function displayPath(cwd: string, filePath: string): string {
	const relative = path.relative(cwd, filePath);
	return relative && !relative.startsWith("..") && !path.isAbsolute(relative)
		? relative.replace(/\\/g, "/")
		: filePath.replace(/\\/g, "/");
}

function buildAllClearOutput(elapsed: number, filePath: string): string {
	const kind = detectFileKind(filePath);
	const langLabel = kind ? getFileKindLabel(kind) : path.extname(filePath);
	const parts = kind
		? [`${langLabel} clean`, `${elapsed}ms`]
		: [`${elapsed}ms`];
	return `✓ ${parts.join(" · ")}`;
}

export interface FormatPhaseResult {
	formatChanged: boolean;
	formattersUsed: string[];
	formatFailures: string[];
	fileContent: string | undefined;
}

export async function runFormatPhase(
	filePath: string,
	getFormatService: () => FormatService,
	dbg: PipelineContext["dbg"],
): Promise<FormatPhaseResult> {
	let formatChanged = false;
	let formattersUsed: string[] = [];
	const formatFailures: string[] = [];
	let fileContent: string | undefined;

	const formatService = getFormatService();
	try {
		formatService.recordRead(filePath);
		const result = await formatService.formatFile(filePath);
		formattersUsed = result.formatters.map((formatter) => formatter.name);
		if (result.anyChanged) {
			formatChanged = true;
			dbg(
				"autoformat: " +
					result.formatters
						.map(
							(formatter) =>
								`${formatter.name}(${formatter.changed ? "changed" : "unchanged"})`,
						)
						.join(", "),
			);
		}
		if (!result.allSucceeded) {
			const failures = result.formatters.filter(
				(formatter) => !formatter.success,
			);
			formatFailures.push(
				...failures.map(
					(formatter) =>
						`${formatter.name}: ${formatter.error ?? "unknown error"}`,
				),
			);
			dbg(
				"autoformat: " +
					failures
						.map(
							(formatter) =>
								`${formatter.name} failed: ${formatter.error ?? "unknown error"}`,
						)
						.join("; "),
			);
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		formatFailures.push(message);
		dbg(`autoformat error: ${err}`);
	}

	try {
		fileContent = nodeFs.readFileSync(filePath, "utf-8");
	} catch {
		fileContent = undefined;
	}

	return { formatChanged, formattersUsed, formatFailures, fileContent };
}

export async function resyncLspFile(
	filePath: string,
	fileContent: string,
	needsContentRefresh: boolean,
	lspSyncCompleted: boolean,
	getFlag: PipelineContext["getFlag"],
	dbg: PipelineContext["dbg"],
	formatChanged = false,
): Promise<void> {
	if (getFlag("no-lsp")) return;
	if (!needsContentRefresh && lspSyncCompleted) return;
	if (exceedsLspSyncLimits(fileContent).tooLarge) return;

	try {
		const lspService = getLSPService();
		if (!lspService.supportsLSP(filePath)) return;
		await lspService.openFile(filePath, fileContent, {
			preserveDiagnostics: formatChanged,
			spawnBudgetMs: LSP_SPAWN_BUDGET_MS,
		});
	} catch (err) {
		dbg(`LSP resync error: ${err}`);
	}
}

export async function runPipeline(
	ctx: PipelineContext,
	deps: PipelineDeps,
): Promise<PipelineResult> {
	const { filePath, cwd, toolName, getFlag, dbg } = ctx;
	const { getFormatService } = deps;
	const phase = createPhaseTracker(toolName, filePath);
	const pipelineStart = Date.now();
	phase.start("total");

	phase.start("read_file");
	let fileContent: string | undefined;
	try {
		fileContent = nodeFs.readFileSync(filePath, "utf-8");
	} catch {
		fileContent = undefined;
	}
	phase.end("read_file");

	if (fileContent) {
		const secretFindings = scanForSecrets(fileContent, filePath);
		if (secretFindings.length > 0) {
			const durationMs = Date.now() - pipelineStart;
			logLatency({
				type: "tool_result",
				toolName,
				filePath,
				durationMs,
				result: "blocked_secrets",
				metadata: { secretsFound: secretFindings.length },
			});
			const secretDiagnostics: SecretDiagnostic[] = secretFindings.map(
				(finding) => ({
					id: `secrets:${finding.line}`,
					message: finding.message,
					filePath,
					line: finding.line,
					column: 1,
					severity: "error",
					semantic: "blocking",
					tool: "secrets-scanner",
					rule: "secrets",
					defectClass: "secrets",
				}),
			);
			emitLensAnalysisComplete({
				cwd,
				filePath,
				toolName,
				model: ctx.telemetry?.model ?? "unknown",
				sessionId: ctx.telemetry?.sessionId ?? "unknown",
				turnIndex: ctx.telemetry?.turnIndex ?? 0,
				writeIndex: ctx.telemetry?.writeIndex ?? 0,
				diagnostics: secretDiagnostics,
				blockers: secretDiagnostics,
				warnings: [],
				fixed: [],
				resolvedCount: 0,
				hasBlockers: true,
				fileModified: false,
				changedFiles: [],
				durationMs,
			});
			return {
				output: `\n\n${formatSecrets(secretFindings, filePath)}`,
				hasBlockers: true,
				isError: true,
				fileModified: false,
				changedFiles: [],
			};
		}
	}

	phase.start("format");
	let formatChanged = false;
	let formatFailures: string[] = [];
	const changedFiles = new Set<string>();
	const autoformatDisabled = !!getFlag("no-autoformat");
	const immediateFormat = !!getFlag("immediate-format");
	const formatDeferred =
		!autoformatDisabled && !immediateFormat && !!fileContent;
	if (!autoformatDisabled && immediateFormat && fileContent) {
		const formatResult = await runFormatPhase(filePath, getFormatService, dbg);
		formatChanged = formatResult.formatChanged;
		formatFailures = formatResult.formatFailures;
		fileContent = formatResult.fileContent;
		if (formatChanged) changedFiles.add(path.resolve(filePath));
	} else if (formatDeferred) {
		dbg(`autoformat: deferred until agent_end for ${filePath}`);
	}
	phase.end("format", { formatChanged, deferred: formatDeferred });

	phase.start("lsp_sync");
	let lspSyncCompleted = false;
	if (fileContent) {
		await resyncLspFile(
			filePath,
			fileContent,
			true,
			false,
			getFlag,
			dbg,
			formatChanged,
		);
		lspSyncCompleted = true;
	}
	phase.end("lsp_sync", { completed: lspSyncCompleted, finalContent: true });

	let output = "";
	if (formatFailures.length > 0) {
		const details = formatFailures.slice(0, 3).join("; ");
		const suffix =
			formatFailures.length > 3
				? `; ... and ${formatFailures.length - 3} more`
				: "";
		output += `\n\n⚠️ Auto-format failed: ${details}${suffix}`;
	}
	if (formatChanged) {
		const changedList = [...changedFiles].map((changedFile) =>
			displayPath(cwd, changedFile),
		);
		const fileList = changedList.length
			? `\nModified files:\n${changedList.map((file) => `  - ${file}`).join("\n")}`
			: "";
		output += `\n\n⚠️ **File was modified by auto-format. You MUST re-read modified file(s) before making any further edits — the content on disk has changed.**${fileList}`;
	}

	const elapsed = Date.now() - pipelineStart;
	if (!output) output = buildAllClearOutput(elapsed, filePath);
	phase.end("total", { hasOutput: !!output });

	return {
		output,
		hasBlockers: false,
		isError: false,
		fileModified: formatChanged,
		changedFiles: [...changedFiles],
	};
}
