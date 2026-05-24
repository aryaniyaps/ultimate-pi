import * as nodeCrypto from "node:crypto";
import * as nodeFs from "node:fs";
import * as path from "node:path";
import { getFormatService } from "./format-service.js";
import { isPathIgnoredByProject } from "./file-utils.js";
import { logLatency } from "./latency-logger.js";
import { runPipeline, type PipelineResult } from "./pipeline.js";
import { resolveProjectRootForFile } from "./project-profile.js";
import { isExternalOrVendorFile } from "./path-utils.js";
import type { RuntimeCoordinator } from "./runtime-coordinator.js";

interface ToolResultEvent {
	toolName: string;
	input: unknown;
	content: Array<{ type: string; text?: string }>;
	provider?: string;
	model?: string;
	sessionId?: string;
	session?: { id?: string };
}

interface ToolResultDeps {
	event: ToolResultEvent;
	getFlag: (name: string) => boolean | string | undefined;
	dbg: (msg: string) => void;
	runtime: RuntimeCoordinator;
	resetLSPService: () => void;
}

const inFlightPipelines = new Map<string, Promise<unknown>>();
const lastAnalyzedStateByFile = new Map<
	string,
	{ turnIndex: number; stateHash: string }
>();

export function clearLastAnalyzedStateCache(): void {
	lastAnalyzedStateByFile.clear();
}

function getFileStateHash(filePath: string): string {
	try {
		const content = nodeFs.readFileSync(filePath);
		return nodeCrypto.createHash("sha256").update(content).digest("hex");
	} catch (err) {
		const code = (err as { code?: string }).code ?? "unknown";
		return `unreadable:${code}`;
	}
}

export async function handleToolResult(deps: ToolResultDeps): Promise<{
	content: Array<{ type: string; text?: string }>;
	isError?: boolean;
} | void> {
	const { event, getFlag, dbg, runtime, resetLSPService } = deps;

	const rawFilePath = (event.input as { path?: string }).path;
	const workspaceRoot = runtime.projectRoot || process.cwd();
	const filePath = rawFilePath
		? path.isAbsolute(rawFilePath)
			? rawFilePath
			: path.resolve(workspaceRoot, rawFilePath)
		: rawFilePath;

	if (event.toolName !== "write" && event.toolName !== "edit") return;
	if (!filePath) return;
	if (isExternalOrVendorFile(filePath, workspaceRoot)) return;
	if (isPathIgnoredByProject(filePath, workspaceRoot, false)) return;

	const initialStateHash = getFileStateHash(filePath);
	const pipelineDedupeKey = `${filePath}:${initialStateHash}`;

	if (inFlightPipelines.has(pipelineDedupeKey)) {
		await inFlightPipelines.get(pipelineDedupeKey);
		return;
	}

	const lastAnalyzed = lastAnalyzedStateByFile.get(filePath);
	if (
		lastAnalyzed?.turnIndex === runtime.turnIndex &&
		lastAnalyzed.stateHash === initialStateHash
	) {
		return;
	}

	const toolResultStart = Date.now();
	const cwd = resolveProjectRootForFile(filePath, workspaceRoot);

	if (event.model || event.provider || event.sessionId || event.session?.id) {
		runtime.setTelemetryIdentity({
			model: event.model,
			provider: event.provider,
			sessionId: event.sessionId ?? event.session?.id,
		});
	}

	const writeIndex = runtime.nextWriteIndex();
	let result: PipelineResult;
	const pipelinePromise = runPipeline(
		{
			filePath,
			cwd,
			toolName: event.toolName,
			telemetry: {
				model: runtime.telemetryModel,
				sessionId: runtime.telemetrySessionId,
				turnIndex: runtime.turnIndex,
				writeIndex,
			},
			getFlag,
			dbg,
		},
		{ getFormatService },
	);
	inFlightPipelines.set(pipelineDedupeKey, pipelinePromise);
	try {
		result = await pipelinePromise;
	} catch (pipelineErr) {
		if (!getFlag("no-lsp")) resetLSPService();
		logLatency({
			type: "tool_result",
			toolName: event.toolName,
			filePath,
			durationMs: Date.now() - toolResultStart,
			result: "pipeline_crash",
		});
		const notice = runtime.formatPipelineCrashNotice(filePath, pipelineErr);
		if (!notice) return;
		return {
			content: [...event.content, { type: "text", text: notice }],
		};
	} finally {
		inFlightPipelines.delete(pipelineDedupeKey);
	}

	lastAnalyzedStateByFile.set(filePath, {
		turnIndex: runtime.turnIndex,
		stateHash: getFileStateHash(filePath),
	});

	if (
		!result.isError &&
		!getFlag("no-autoformat") &&
		!getFlag("immediate-format") &&
		nodeFs.existsSync(filePath)
	) {
		runtime.deferFormat(filePath, cwd, event.toolName);
		dbg(`tool_result: queued deferred format for ${filePath}`);
	}

	if (result.isError) {
		return {
			content: [...event.content, { type: "text", text: result.output }],
			isError: true,
		};
	}

	runtime.updateGitGuardStatus(result.hasBlockers, result.output);

	logLatency({
		type: "tool_result",
		toolName: event.toolName,
		filePath,
		durationMs: Date.now() - toolResultStart,
		result: result.output ? "completed" : "no_output",
	});

	if (!result.output) return;
	return {
		content: [...event.content, { type: "text", text: result.output }],
	};
}
