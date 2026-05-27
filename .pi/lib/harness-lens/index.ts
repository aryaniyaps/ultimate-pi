/**
 * Harness-native lens extension entry.
 * Edit autopatch, secrets block, deferred format, LSP delegate.
 */

import * as nodeFs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import { anchoredEditTaskId } from "../harness-anchored-edit/task-id.js";
import {
	applyAnchoredEditAutopatch,
	isAnchoredEditToolInput,
} from "./clients/anchored-edit-autopatch.js";
import {
	tryCorrectIndentationMismatch,
	tryCorrectIndentationMismatchFromContent,
} from "./clients/edit-autopatch.js";
import { detectFileKind } from "./clients/file-kinds.js";
import { isPathIgnoredByProject } from "./clients/file-utils.js";
import {
	getFormatService,
	resetFormatService,
} from "./clients/format-service.js";
import {
	evaluateGitGuard,
	isGitCommitOrPushAttempt,
} from "./clients/git-guard.js";
import { retargetReplacementIndentation } from "./clients/indent-retarget.js";
import { ensureTool } from "./clients/installer/index.js";
import {
	loadPiLensGlobalConfig,
	resolvePiLensFlag,
} from "./clients/lens-config.js";
import { initLensEvents } from "./clients/lens-events.js";
import { initLSPConfig } from "./clients/lsp/config.js";
import { getLSPService, resetLSPService } from "./clients/lsp/index.js";
import { isExternalOrVendorFile } from "./clients/path-utils.js";
import {
	detectProjectProfile,
	lspPreinstallTools,
} from "./clients/project-profile.js";
import { handleAgentEnd } from "./clients/runtime-agent-end.js";
import { RuntimeCoordinator } from "./clients/runtime-coordinator.js";
import {
	clearLastAnalyzedStateCache,
	handleToolResult,
} from "./clients/runtime-tool-result.js";
import { clearWidgetState } from "./clients/widget-state.js";
import { createLspDiagnosticsTool } from "./tools/lsp-diagnostics.js";
import { createLspNavigationTool } from "./tools/lsp-navigation.js";

const DEBUG_LOG_DIR = path.join(process.cwd(), ".pi", "harness", ".lens");
const DEBUG_LOG = path.join(DEBUG_LOG_DIR, "sessionstart.log");

function dbg(msg: string): void {
	if (process.env.PI_LENS_TEST_MODE === "1" || process.env.VITEST) return;
	const line = `[${new Date().toISOString()}] ${msg}\n`;
	try {
		nodeFs.mkdirSync(DEBUG_LOG_DIR, { recursive: true });
		nodeFs.appendFileSync(DEBUG_LOG, line);
	} catch {
		// best-effort debug log
	}
}

const runtime = new RuntimeCoordinator();
const lspConfigInitializedCwds = new Set<string>();

async function ensureLSPConfigInitialized(cwd: string): Promise<void> {
	const normalized = path.resolve(cwd);
	if (lspConfigInitializedCwds.has(normalized)) return;
	await initLSPConfig(normalized);
	lspConfigInitializedCwds.add(normalized);
}

function getLensFlag(
	name: string,
	getFlag: (name: string) => boolean | string | undefined,
	global: ReturnType<typeof loadPiLensGlobalConfig>,
): boolean | string | undefined {
	return resolvePiLensFlag(name, getFlag, global);
}

function resolveToolCallFilePath(
	rawFilePath: string | undefined,
	cwd: string | undefined,
	projectRoot: string,
): string | undefined {
	if (!rawFilePath) return undefined;
	if (path.isAbsolute(rawFilePath)) return rawFilePath;
	return path.resolve(cwd ?? projectRoot, rawFilePath);
}

function getToolCallRawFilePath(
	toolName: string,
	event: { input?: unknown },
): string | undefined {
	const inputObj = (event.input ?? {}) as Record<string, unknown>;
	if (
		isToolCallEventType(
			"write",
			event as Parameters<typeof isToolCallEventType>[1],
		) ||
		isToolCallEventType(
			"edit",
			event as Parameters<typeof isToolCallEventType>[1],
		)
	) {
		const filePath = (event.input as { path?: unknown }).path;
		return typeof filePath === "string" ? filePath : undefined;
	}
	if (toolName === "read") {
		if (typeof inputObj.path === "string") return inputObj.path;
		if (typeof inputObj.filePath === "string") return inputObj.filePath;
	}
	if (toolName === "lsp_navigation" && typeof inputObj.filePath === "string") {
		return inputObj.filePath;
	}
	return undefined;
}

function shouldSkipLspAutoTouch(
	filePath: string,
	projectRoot: string,
): boolean {
	const normalized = path.resolve(filePath).replace(/\\/g, "/").toLowerCase();
	if (normalized.includes("/.pi/harness/.lens/")) return true;
	if (normalized.includes("/.harness/")) return true;
	if (isExternalOrVendorFile(filePath, projectRoot)) return true;
	return false;
}

function isLspCapableFile(filePath: string): boolean {
	return getLSPService().supportsLSP(filePath) || !!detectFileKind(filePath);
}

function normalizeOldTextForMatch(text: string): string {
	return text
		.replace(/\r\n/g, "\n")
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n");
}

function countTextOccurrences(haystack: string, needle: string): number {
	if (!needle) return 0;
	let count = 0;
	let pos = 0;
	while (pos < haystack.length) {
		const idx = haystack.indexOf(needle, pos);
		if (idx === -1) break;
		count += 1;
		pos = idx + needle.length;
	}
	return count;
}

function countOldTextMatches(
	filePath: string,
	oldText: string,
	cachedNormalizedContent?: string,
): number {
	try {
		const content =
			cachedNormalizedContent ??
			normalizeOldTextForMatch(nodeFs.readFileSync(filePath, "utf-8"));
		return countTextOccurrences(content, normalizeOldTextForMatch(oldText));
	} catch {
		return 0;
	}
}

function isIndentationOnlyChange(before: string, after: string): boolean {
	const beforeLines = before.replace(/\r\n/g, "\n").split("\n");
	const afterLines = after.replace(/\r\n/g, "\n").split("\n");
	if (beforeLines.length !== afterLines.length) return false;
	return beforeLines.every(
		(line, index) => line.trim() === afterLines[index].trim(),
	);
}

type EditIndentTarget = {
	label: string;
	value: string;
	newText: string | undefined;
	apply: (corrected: string) => void;
	applyNewText: (corrected: string) => void;
};

function applyEditAutopatch(
	filePath: string,
	editInput: {
		oldText?: string;
		newText?: string;
		edits?: Array<{ oldText?: string; newText?: string }>;
	},
): { block: true; reason: string } | undefined {
	const oldTexts: EditIndentTarget[] = editInput.oldText
		? [
				{
					label: "oldText",
					value: editInput.oldText,
					newText: editInput.newText,
					apply: (corrected) => {
						editInput.oldText = corrected;
					},
					applyNewText: (corrected) => {
						editInput.newText = corrected;
					},
				},
			]
		: (editInput.edits ?? [])
				.map((entry, index) =>
					entry.oldText
						? {
								label: `edits[${index}].oldText`,
								value: entry.oldText,
								newText: entry.newText,
								apply: (corrected: string) => {
									entry.oldText = corrected;
								},
								applyNewText: (corrected: string) => {
									entry.newText = corrected;
								},
							}
						: null,
				)
				.filter((entry): entry is EditIndentTarget => entry !== null);

	let crlfContent: string | undefined;
	let matchNormalizedContent: string | undefined;
	try {
		const raw = nodeFs.readFileSync(filePath, "utf-8");
		crlfContent = raw.replace(/\r\n/g, "\n");
		matchNormalizedContent = normalizeOldTextForMatch(raw);
	} catch {
		return undefined;
	}

	if (matchNormalizedContent !== undefined) {
		for (const entry of oldTexts) {
			const normalizedValue = entry.value.replace(/\r\n/g, "\n");
			const stripped = normalizedValue
				.split("\n")
				.map((line) => line.trimEnd())
				.join("\n");
			if (stripped === normalizedValue) continue;
			if (
				countOldTextMatches(filePath, stripped, matchNormalizedContent) !== 1
			) {
				continue;
			}
			entry.apply(stripped);
			entry.value = stripped;
		}
	}

	const correctedOldTexts = oldTexts
		.map(({ label, value, newText, apply, applyNewText }) => {
			const corrected =
				crlfContent !== undefined
					? tryCorrectIndentationMismatchFromContent(value, crlfContent)
					: tryCorrectIndentationMismatch(value, filePath);
			if (corrected === undefined) return undefined;
			return {
				label,
				value,
				newText,
				corrected,
				apply,
				applyNewText,
				currentMatchCount: countOldTextMatches(
					filePath,
					value,
					matchNormalizedContent,
				),
				correctedMatchCount: countOldTextMatches(
					filePath,
					corrected,
					matchNormalizedContent,
				),
				indentationOnly: isIndentationOnlyChange(value, corrected),
			};
		})
		.filter(
			(
				entry,
			): entry is EditIndentTarget & {
				corrected: string;
				currentMatchCount: number;
				correctedMatchCount: number;
				indentationOnly: boolean;
			} => entry !== undefined,
		);

	if (correctedOldTexts.length === 0) return undefined;

	const unsafe = correctedOldTexts.filter(
		(entry) =>
			!entry.indentationOnly ||
			entry.currentMatchCount !== 0 ||
			entry.correctedMatchCount !== 1,
	);
	if (unsafe.length > 0) {
		const details = unsafe
			.map(({ label, value, correctedMatchCount, indentationOnly }) => {
				const preview = value.trimStart().slice(0, 60).replace(/\n/g, "↵");
				const reason = !indentationOnly
					? "the proposed correction was not indentation-only"
					: `the corrected oldText matches ${correctedMatchCount} locations`;
				return `${label} ("${preview}…") cannot be auto-patched because ${reason}.`;
			})
			.join("\n");
		return {
			block: true,
			reason:
				`🔄 RETRYABLE — Indentation mismatch detected\n\n` +
				`harness-lens can auto-patch indentation-only oldText mismatches when the corrected text matches exactly one location.\n\n` +
				`${details}\n\n` +
				`Next action: re-read the relevant section, then retry with oldText copied verbatim from the read output.`,
		};
	}

	for (const entry of correctedOldTexts) {
		entry.apply(entry.corrected);
		const correctedNewText = entry.newText
			? retargetReplacementIndentation(
					entry.newText,
					entry.value,
					entry.corrected,
				)
			: undefined;
		if (correctedNewText !== undefined) entry.applyNewText(correctedNewText);
	}
	return undefined;
}

function registerLensRuntimePart1(
	pi: ExtensionAPI,
	getFlag: (name: string) => boolean | string | undefined,
	runtime: RuntimeCoordinator,
	lensEnabledRef: { current: boolean },
) {
	pi.registerFlag("no-lens", {
		description: "Disable harness-lens for this session.",
		type: "boolean",
		default: false,
	});
}

function registerLensRuntimePart2(
	pi: ExtensionAPI,
	getFlag: (name: string) => boolean | string | undefined,
	runtime: RuntimeCoordinator,
	lensEnabledRef: { current: boolean },
) {
	pi.registerFlag("no-lsp", {
		description: "Disable LSP auto-touch and lsp_* tools backing servers.",
		type: "boolean",
		default: false,
	});
}

function registerLensRuntimePart3(
	pi: ExtensionAPI,
	getFlag: (name: string) => boolean | string | undefined,
	runtime: RuntimeCoordinator,
	lensEnabledRef: { current: boolean },
) {
	pi.registerFlag("no-autoformat", {
		description: "Disable auto-format on write/edit.",
		type: "boolean",
		default: false,
	});
}

function registerLensRuntimePart4(
	pi: ExtensionAPI,
	getFlag: (name: string) => boolean | string | undefined,
	runtime: RuntimeCoordinator,
	lensEnabledRef: { current: boolean },
) {
	pi.registerFlag("immediate-format", {
		description: "Format during tool_result instead of deferring to agent_end.",
		type: "boolean",
		default: false,
	});
}

function registerLensRuntimePart5(
	pi: ExtensionAPI,
	getFlag: (name: string) => boolean | string | undefined,
	runtime: RuntimeCoordinator,
	lensEnabledRef: { current: boolean },
) {
	pi.registerFlag("lens-guard", {
		description: "Block git commit/push while unresolved lens blockers exist.",
		type: "boolean",
		default: false,
	});
}

function registerLensRuntimePart6(
	pi: ExtensionAPI,
	getFlag: (name: string) => boolean | string | undefined,
	runtime: RuntimeCoordinator,
	lensEnabledRef: { current: boolean },
) {
	pi.registerTool(createLspDiagnosticsTool());
}

function registerLensRuntimePart7(
	pi: ExtensionAPI,
	getFlag: (name: string) => boolean | string | undefined,
	runtime: RuntimeCoordinator,
	lensEnabledRef: { current: boolean },
) {
	pi.registerTool(createLspNavigationTool(getFlag));
}

function registerLensRuntimePart8(
	pi: ExtensionAPI,
	getFlag: (name: string) => boolean | string | undefined,
	runtime: RuntimeCoordinator,
	lensEnabledRef: { current: boolean },
) {
	pi.on("session_start", async (_event, ctx) => {
		if (getFlag("no-lens")) {
			lensEnabledRef.current = false;
			return;
		}
		lensEnabledRef.current = true;
		runtime.resetForSession();
		clearWidgetState();
		resetFormatService();
		if (!getFlag("no-lsp")) resetLSPService();

		const cwd = ctx.cwd ?? process.cwd();
		runtime.projectRoot = cwd;
		clearLastAnalyzedStateCache();
		lspConfigInitializedCwds.clear();

		try {
			await ensureLSPConfigInitialized(cwd);
		} catch (err) {
			dbg(`session_start lsp config init failed: ${err}`);
		}

		if (getFlag("no-lsp")) return;

		const profile = detectProjectProfile(cwd);
		const tools = lspPreinstallTools(profile);
		dbg(
			`session_start profile kinds=${profile.detectedKinds.join(",")} lsp=${tools.join(",")}`,
		);
		for (const toolId of tools) {
			void ensureTool(toolId).catch((err) => {
				dbg(`session_start lsp preinstall ${toolId} failed: ${err}`);
			});
		}
	});
}

function registerLensRuntimePart9(
	pi: ExtensionAPI,
	getFlag: (name: string) => boolean | string | undefined,
	runtime: RuntimeCoordinator,
	lensEnabledRef: { current: boolean },
) {
	pi.on("turn_start", () => {
		if (!lensEnabledRef.current) return;
		runtime.beginTurn();
		clearLastAnalyzedStateCache();
	});
}

async function ensureToolCallLspConfig(args: {
	getFlag: (name: string) => boolean | string | undefined;
	filePath: string | undefined;
	ctx: any;
	runtime: RuntimeCoordinator;
}): Promise<void> {
	if (args.getFlag("no-lsp")) return;
	try {
		await ensureLSPConfigInitialized(
			args.filePath
				? path.dirname(args.filePath)
				: (args.ctx.cwd ?? args.runtime.projectRoot),
		);
	} catch (err) {
		dbg(`tool_call lsp config init failed: ${err}`);
	}
}

function maybeAutoTouchLspOnToolCall(args: {
	getFlag: (name: string) => boolean | string | undefined;
	toolName: string;
	filePath: string;
	runtime: RuntimeCoordinator;
}): void {
	if (
		args.getFlag("no-lsp") ||
		!isLspCapableFile(args.filePath) ||
		shouldSkipLspAutoTouch(args.filePath, args.runtime.projectRoot)
	) {
		return;
	}
	const shouldWarmRead =
		args.toolName === "read" && args.runtime.shouldWarmLspOnRead(args.filePath);
	const shouldTouch =
		args.toolName === "write" ||
		args.toolName === "edit" ||
		args.toolName === "lsp_navigation" ||
		shouldWarmRead;
	if (!shouldTouch) return;
	try {
		const content = nodeFs.readFileSync(args.filePath, "utf-8");
		if (args.toolName === "read")
			args.runtime.markLspReadWarmStarted(args.filePath);
		void getLSPService()
			.touchFile(args.filePath, content, {
				diagnostics: "none",
				source: `tool_call:${args.toolName}`,
			})
			.then((result) => {
				if (args.toolName !== "read") return;
				if (result === undefined)
					args.runtime.clearLspReadWarmState(args.filePath);
				else args.runtime.markLspReadWarmCompleted(args.filePath);
			})
			.catch((err) => {
				if (args.toolName === "read") {
					args.runtime.clearLspReadWarmState(args.filePath);
				}
				dbg(`lsp auto-touch failed: ${err}`);
			});
	} catch {
		if (args.toolName === "read")
			args.runtime.clearLspReadWarmState(args.filePath);
	}
}

function applyEditAutopatchForToolCall(
	filePath: string,
	event: unknown,
	ctx: unknown,
) {
	if (
		!isToolCallEventType(
			"edit",
			event as Parameters<typeof isToolCallEventType>[1],
		)
	) {
		return undefined;
	}
	const editInput = (event as { input?: unknown }).input;
	if (isAnchoredEditToolInput(editInput)) {
		return applyAnchoredEditAutopatch(
			filePath,
			editInput,
			anchoredEditTaskId({
				sessionId: (ctx as { sessionId?: string }).sessionId,
			}),
		);
	}
	const legacyInput = editInput as {
		oldText?: string;
		newText?: string;
		edits?: Array<{ oldText?: string; newText?: string }>;
	};
	return applyEditAutopatch(filePath, legacyInput);
}

function registerLensRuntimePart10(
	pi: ExtensionAPI,
	getFlag: (name: string) => boolean | string | undefined,
	runtime: RuntimeCoordinator,
	lensEnabledRef: { current: boolean },
) {
	pi.on("tool_call", async (event, ctx) => {
		if (!lensEnabledRef.current) return;

		const toolName = (event as { toolName?: string }).toolName ?? "";
		if (
			getFlag("lens-guard") &&
			isGitCommitOrPushAttempt(toolName, event.input)
		) {
			const guard = evaluateGitGuard(runtime);
			if (guard.block) return { block: true, reason: guard.reason };
		}

		const rawFilePath = getToolCallRawFilePath(toolName, event);
		const filePath = resolveToolCallFilePath(
			rawFilePath,
			ctx.cwd,
			runtime.projectRoot,
		);

		await ensureToolCallLspConfig({ getFlag, filePath, ctx, runtime });
		if (!filePath || !nodeFs.existsSync(filePath)) return;
		if (isPathIgnoredByProject(filePath, runtime.projectRoot, false)) return;

		maybeAutoTouchLspOnToolCall({ getFlag, toolName, filePath, runtime });
		const block = applyEditAutopatchForToolCall(filePath, event, ctx);
		if (block) return block;
	});
}

function registerLensRuntimePart11(
	pi: ExtensionAPI,
	getFlag: (name: string) => boolean | string | undefined,
	runtime: RuntimeCoordinator,
	lensEnabledRef: { current: boolean },
) {
	pi as any;
}

function registerLensRuntimePart12(
	pi: ExtensionAPI,
	getFlag: (name: string) => boolean | string | undefined,
	runtime: RuntimeCoordinator,
	lensEnabledRef: { current: boolean },
) {
	pi.on("agent_end", async (_event, ctx) => {
		if (!lensEnabledRef.current) return;
		await handleAgentEnd({
			ctxCwd: ctx.cwd,
			getFlag,
			notify: (msg, level) => ctx.ui?.notify(msg, level),
			dbg,
			runtime,
			getFormatService: () =>
				getFormatService(runtime.telemetrySessionId, !getFlag("no-autoformat")),
		});
	});
}

function registerHarnessLensRuntime(
	pi: ExtensionAPI,
	args: {
		getFlag: (name: string) => boolean | string | undefined;
		runtime: RuntimeCoordinator;
		lensEnabledRef: { current: boolean };
	},
) {
	const { getFlag, runtime, lensEnabledRef } = args;
	registerLensRuntimePart1(pi, getFlag, runtime, lensEnabledRef);
	registerLensRuntimePart2(pi, getFlag, runtime, lensEnabledRef);
	registerLensRuntimePart3(pi, getFlag, runtime, lensEnabledRef);
	registerLensRuntimePart4(pi, getFlag, runtime, lensEnabledRef);
	registerLensRuntimePart5(pi, getFlag, runtime, lensEnabledRef);
	registerLensRuntimePart6(pi, getFlag, runtime, lensEnabledRef);
	registerLensRuntimePart7(pi, getFlag, runtime, lensEnabledRef);
	registerLensRuntimePart8(pi, getFlag, runtime, lensEnabledRef);
	registerLensRuntimePart9(pi, getFlag, runtime, lensEnabledRef);
	registerLensRuntimePart10(pi, getFlag, runtime, lensEnabledRef);
	registerLensRuntimePart11(pi, getFlag, runtime, lensEnabledRef);
	registerLensRuntimePart12(pi, getFlag, runtime, lensEnabledRef);
}

export default function harnessLensExtension(pi: ExtensionAPI): void {
	initLensEvents(pi);
	const globalConfig = loadPiLensGlobalConfig();
	const lensEnabledRef = { current: !globalConfig.noLens };

	type PiWithFlags = ExtensionAPI & {
		getFlag?: (name: string) => boolean | string | undefined;
	};
	const piFlags = pi as PiWithFlags;
	const readCliFlag = (name: string): boolean | undefined => {
		if (typeof piFlags.getFlag === "function") {
			const flag = piFlags.getFlag(name);
			return typeof flag === "boolean" ? flag : undefined;
		}
		return process.argv.includes(`--${name}`) ? true : undefined;
	};
	const getFlag = (name: string) =>
		getLensFlag(name, readCliFlag, globalConfig);

	registerHarnessLensRuntime(pi, { getFlag, runtime, lensEnabledRef });
}
