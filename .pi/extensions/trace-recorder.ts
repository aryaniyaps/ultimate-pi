/**
 * trace-recorder — append-only run tracing with correlation ids.
 *
 * Writes:
 * - `.pi/harness/runs/<run_id>/events.jsonl` (full payload refs/events)
 * - `.pi/harness/runs/<run_id>/trace.json` (RunTrace-like summary)
 * - `.pi/harness/runs/index.jsonl` (compact trace index)
 */

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { captureHarnessEvent } from "./lib/harness-posthog.js";

type HarnessPhase = "plan" | "execute" | "evaluate" | "adversary" | "merge";

interface ToolSpan {
	tool_call_id: string;
	tool_name: string;
	started_at: string;
	ended_at: string;
}

interface ActiveRun {
	runId: string;
	planId: string;
	phase: HarnessPhase;
	startedAt: string;
	toolSpans: Map<string, ToolSpan>;
	artifactRefs: Set<string>;
}

interface SessionEntryLike {
	type?: string;
	customType?: string;
	data?: { phase?: HarnessPhase; planId?: string };
	message?: {
		role?: string;
		usage?: { input?: number; output?: number };
	};
}

interface ToolEventLike {
	input?: Record<string, unknown>;
	details?: unknown;
}

const RUNS_ROOT = join(process.cwd(), ".pi", "harness", "runs");
const INDEX_PATH = join(RUNS_ROOT, "index.jsonl");

function nowIso(): string {
	return new Date().toISOString();
}

function makeRunId(sessionId: string): string {
	return `${sessionId}-${Date.now()}`;
}

function parsePhase(ctx: {
	sessionManager: { getEntries(): unknown[] };
}): HarnessPhase {
	const entries = ctx.sessionManager.getEntries() as SessionEntryLike[];
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (
			entry.type === "custom" &&
			entry.customType === "harness-policy-state"
		) {
			const phase = entry.data?.phase;
			if (
				phase === "plan" ||
				phase === "execute" ||
				phase === "evaluate" ||
				phase === "adversary" ||
				phase === "merge"
			) {
				return phase;
			}
		}
	}
	return "plan";
}

function parsePlanId(ctx: {
	sessionManager: { getEntries(): unknown[] };
}): string {
	const entries = ctx.sessionManager.getEntries() as SessionEntryLike[];
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (
			entry.type === "custom" &&
			entry.customType === "harness-policy-state"
		) {
			const planId = entry.data?.planId;
			if (typeof planId === "string" && planId.length > 0) return planId;
		}
	}
	return "plan-unknown";
}

function usageTotals(ctx: { sessionManager: { getEntries(): unknown[] } }): {
	input_tokens: number;
	output_tokens: number;
	total_tokens: number;
} {
	const entries = ctx.sessionManager.getEntries() as SessionEntryLike[];
	let input = 0;
	let output = 0;
	for (const entry of entries) {
		if (entry.type !== "message" || entry.message?.role !== "assistant")
			continue;
		const usage = entry.message.usage ?? {};
		input += Number(usage.input ?? 0);
		output += Number(usage.output ?? 0);
	}
	return {
		input_tokens: input,
		output_tokens: output,
		total_tokens: input + output,
	};
}

function pullArtifactRefs(event: ToolEventLike): string[] {
	const refs: string[] = [];
	const input = event.input ?? {};
	const details =
		event.details && typeof event.details === "object"
			? (event.details as Record<string, unknown>)
			: {};
	const maybePaths = [
		input.filePath,
		input.path,
		input.targetPath,
		details?.path,
		details?.targetPath,
	];
	for (const candidate of maybePaths) {
		if (typeof candidate === "string" && candidate.length > 0)
			refs.push(candidate);
	}
	return refs;
}

async function ensureRunDir(runId: string): Promise<string> {
	const runDir = join(RUNS_ROOT, runId);
	await mkdir(runDir, { recursive: true });
	return runDir;
}

async function readRunTraceSchemaVersion(): Promise<string> {
	try {
		const schemaPath = join(
			process.cwd(),
			".pi",
			"harness",
			"specs",
			"run-trace.schema.json",
		);
		const parsed = JSON.parse(await readFile(schemaPath, "utf-8")) as {
			properties?: { schema_version?: { const?: string } };
		};
		return String(parsed?.properties?.schema_version?.const ?? "1.0.0");
	} catch {
		return "1.0.0";
	}
}

export default function traceRecorder(pi: ExtensionAPI) {
	let activeRun: ActiveRun | null = null;

	async function writeEvent(
		runId: string,
		payload: Record<string, unknown>,
	): Promise<void> {
		const runDir = await ensureRunDir(runId);
		await appendFile(
			join(runDir, "events.jsonl"),
			`${JSON.stringify({ timestamp: nowIso(), ...payload })}\n`,
			"utf-8",
		);
	}

	pi.on("agent_start", async (_event, ctx) => {
		const sessionId = ctx.sessionManager.getSessionId();
		const runId = makeRunId(sessionId);
		const startedAt = nowIso();
		activeRun = {
			runId,
			planId: parsePlanId(ctx),
			phase: parsePhase(ctx),
			startedAt,
			toolSpans: new Map(),
			artifactRefs: new Set(),
		};
		pi.appendEntry("harness-trace-state", {
			run_id: runId,
			plan_id: activeRun.planId,
			phase: activeRun.phase,
			started_at: startedAt,
		});
		captureHarnessEvent(sessionId, "harness_run_started", {
			harness_run_id: runId,
			harness_plan_id: activeRun.planId,
			harness_phase: activeRun.phase,
			pi_session_id: sessionId,
			model: ctx.model?.id ?? "unknown",
			thinking_level:
				pi.getThinkingLevel() === "minimal" ? "off" : pi.getThinkingLevel(),
		});
		await writeEvent(runId, {
			type: "run_start",
			run_id: runId,
			plan_id: activeRun.planId,
			phase: activeRun.phase,
		});
	});

	pi.on("tool_execution_start", async (event) => {
		if (!activeRun) return;
		activeRun.toolSpans.set(event.toolCallId, {
			tool_call_id: event.toolCallId,
			tool_name: event.toolName,
			started_at: nowIso(),
			ended_at: nowIso(),
		});
		await writeEvent(activeRun.runId, {
			type: "tool_start",
			run_id: activeRun.runId,
			tool_call_id: event.toolCallId,
			tool_name: event.toolName,
		});
	});

	pi.on("tool_result", async (event) => {
		if (!activeRun) return;
		const span = activeRun.toolSpans.get(event.toolCallId);
		if (span) {
			span.ended_at = nowIso();
		}
		for (const ref of pullArtifactRefs(event)) activeRun.artifactRefs.add(ref);
		await writeEvent(activeRun.runId, {
			type: "tool_result",
			run_id: activeRun.runId,
			tool_call_id: event.toolCallId,
			tool_name: event.toolName,
			is_error: event.isError,
		});
	});

	pi.on("agent_end", async (_event, ctx) => {
		if (!activeRun) return;
		activeRun.phase = parsePhase(ctx);

		const schemaVersion = await readRunTraceSchemaVersion();
		const usage = usageTotals(ctx);
		const runDir = await ensureRunDir(activeRun.runId);
		const toolSpans = Array.from(activeRun.toolSpans.values());
		const endedAt = nowIso();
		const durationMs = Math.max(
			0,
			Date.parse(endedAt) - Date.parse(activeRun.startedAt),
		);
		const sessionId = ctx.sessionManager.getSessionId();
		const summary = {
			schema_version: schemaVersion,
			contract_version: "1.0.0",
			run_id: activeRun.runId,
			plan_id: activeRun.planId,
			agent_id: sessionId,
			pi_session_id: sessionId,
			phase: activeRun.phase,
			model: ctx.model?.id ?? "unknown",
			thinking_level:
				pi.getThinkingLevel() === "minimal" ? "off" : pi.getThinkingLevel(),
			started_at: activeRun.startedAt,
			ended_at: endedAt,
			duration_ms: durationMs,
			tool_spans: toolSpans,
			tool_span_count: toolSpans.length,
			artifact_refs: Array.from(activeRun.artifactRefs.values()),
			artifact_ref_count: activeRun.artifactRefs.size,
			cost: usage,
		};

		await writeFile(
			join(runDir, "trace.json"),
			`${JSON.stringify(summary, null, 2)}\n`,
			"utf-8",
		);
		await appendFile(
			INDEX_PATH,
			`${JSON.stringify({
				timestamp: nowIso(),
				run_id: activeRun.runId,
				plan_id: activeRun.planId,
				phase: activeRun.phase,
				trace_file: join(runDir, "trace.json"),
			})}\n`,
			"utf-8",
		);

		pi.appendEntry("harness-run-trace", summary);
		pi.appendEntry("harness-run-record", summary);
		await writeEvent(activeRun.runId, {
			type: "run_end",
			run_id: activeRun.runId,
			phase: activeRun.phase,
			tool_span_count: toolSpans.length,
			artifact_ref_count: activeRun.artifactRefs.size,
		});

		activeRun = null;
	});

	pi.registerCommand("harness-trace-last", {
		description: "Show last recorded run trace id",
		handler: async (_args, ctx) => {
			const entries = ctx.sessionManager.getEntries();
			for (let i = entries.length - 1; i >= 0; i--) {
				const entry = entries[i];
				if (
					entry.type === "custom" &&
					entry.customType === "harness-run-trace"
				) {
					const data = entry.data as { run_id?: string } | undefined;
					const msg = `Last run trace: ${data?.run_id ?? "(unknown)"}`;
					if (ctx.hasUI) {
						ctx.ui.notify(msg, "info");
					} else {
						pi.sendMessage({
							customType: "harness-trace-last",
							content: msg,
							display: true,
						});
					}
					return;
				}
			}
			if (ctx.hasUI) ctx.ui.notify("No harness trace recorded yet.", "warning");
		},
	});
}
