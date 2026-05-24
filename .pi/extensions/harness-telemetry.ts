/**
 * harness-telemetry — PostHog harness_* domain events (dual layer with @posthog/pi).
 *
 * Emission strategy:
 * - harness_run_started on agent_start (when trace state exists)
 * - agent_end flush: scan new session custom entries; dedupe by (customType, hash)
 * - harness_run_completed from harness-run-record / harness-run-trace
 */

import { createHash } from "node:crypto";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isHarnessProjectEnabled } from "../lib/harness-project-config.js";
import {
	captureHarnessEvent,
	type HarnessPostHogEventName,
	shutdownHarnessPostHog,
} from "../lib/harness-posthog.js";

type HarnessPhase = "plan" | "execute" | "evaluate" | "adversary" | "merge";

interface SessionEntryLike {
	type?: string;
	customType?: string;
	data?: Record<string, unknown>;
	message?: {
		customType?: string;
		content?: string;
	};
}

interface TraceState {
	run_id: string;
	plan_id: string;
	phase: HarnessPhase;
	started_at: string;
}

interface PolicyState {
	phase: HarnessPhase;
	planId: string | null;
}

const FLUSH_MAP: Record<string, HarnessPostHogEventName> = {
	"harness-policy-violation": "harness_policy_violation",
	"harness-policy-aborted": "harness_policy_abort",
	"harness-budget-soft-limit": "harness_budget_soft_limit",
	"harness-budget-exhausted": "harness_budget_exhausted",
	"harness-review-integrity-block": "harness_review_integrity_block",
	"harness-test-integrity-flag": "harness_test_integrity_flag",
	"harness-debate-envelope": "harness_debate_round",
	"harness-consensus-packet": "harness_debate_consensus",
	"harness-drift-report": "harness_drift_report",
	"harness-eval-verdict": "harness_eval_verdict",
	"harness-sentrux-signal": "harness_sentrux_signal",
	"harness-observation": "harness_observation",
};

function hashEntry(customType: string, data: unknown): string {
	return createHash("sha256")
		.update(customType)
		.update(JSON.stringify(data ?? {}))
		.digest("hex")
		.slice(0, 16);
}

function getTraceState(ctx: {
	sessionManager: { getEntries(): unknown[] };
}): TraceState | null {
	const entries = ctx.sessionManager.getEntries() as SessionEntryLike[];
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type !== "custom" || entry.customType !== "harness-trace-state")
			continue;
		const data = entry.data ?? {};
		const runId = data.run_id;
		if (typeof runId !== "string" || runId.length === 0) return null;
		return {
			run_id: runId,
			plan_id: typeof data.plan_id === "string" ? data.plan_id : "plan-unknown",
			phase:
				data.phase === "plan" ||
				data.phase === "execute" ||
				data.phase === "evaluate" ||
				data.phase === "adversary" ||
				data.phase === "merge"
					? (data.phase as HarnessPhase)
					: "plan",
			started_at:
				typeof data.started_at === "string"
					? data.started_at
					: new Date().toISOString(),
		};
	}
	return null;
}

function getPolicyState(ctx: {
	sessionManager: { getEntries(): unknown[] };
}): PolicyState | null {
	const entries = ctx.sessionManager.getEntries() as SessionEntryLike[];
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type !== "custom" || entry.customType !== "harness-policy-state")
			continue;
		const data = entry.data ?? {};
		const phase = data.phase;
		return {
			phase:
				phase === "plan" ||
				phase === "execute" ||
				phase === "evaluate" ||
				phase === "adversary" ||
				phase === "merge"
					? phase
					: "plan",
			planId: typeof data.planId === "string" ? data.planId : null,
		};
	}
	return null;
}

function propsFromRun(
	distinctId: string,
	runId: string,
	planId: string,
	phase: HarnessPhase,
	extra: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		harness_run_id: runId,
		run_id: runId,
		harness_plan_id: planId,
		harness_phase: phase,
		pi_session_id: distinctId,
		...extra,
	};
}

function normalizedRunId(
	data: Record<string, unknown>,
	trace: TraceState | null,
	distinctId: string,
): string {
	const fromData = [
		data.harness_run_id,
		data.run_id,
		data.runId,
		data.debate_id,
	];
	for (const candidate of fromData) {
		if (typeof candidate === "string" && candidate.trim().length > 0) {
			return candidate;
		}
	}
	if (typeof trace?.run_id === "string" && trace.run_id.length > 0) {
		return trace.run_id;
	}
	return distinctId;
}

function mapCustomEntry(
	customType: string,
	data: Record<string, unknown>,
	trace: TraceState | null,
	policy: PolicyState | null,
	distinctId: string,
): {
	event: HarnessPostHogEventName;
	properties: Record<string, unknown>;
} | null {
	const runId = normalizedRunId(data, trace, distinctId);
	const planId =
		(typeof data.harness_plan_id === "string" && data.harness_plan_id) ||
		(typeof data.plan_id === "string" && data.plan_id) ||
		policy?.planId ||
		trace?.plan_id ||
		"plan-unknown";
	const phase =
		(data.phase as HarnessPhase | undefined) ||
		policy?.phase ||
		trace?.phase ||
		"plan";
	const base = propsFromRun(distinctId, runId, planId, phase);

	if (customType === "harness-policy-state") {
		const fromPhase =
			typeof data.previous_phase === "string" ? data.previous_phase : undefined;
		const toPhase = phase;
		if (!fromPhase || fromPhase === toPhase) return null;
		return {
			event: "harness_phase_transition",
			properties: {
				...base,
				from_phase: fromPhase,
				to_phase: toPhase,
			},
		};
	}

	const mapped = FLUSH_MAP[customType];
	if (!mapped) return null;

	if (customType === "harness-debate-envelope") {
		const kind = data.kind;
		if (kind === "consensus") {
			return {
				event: "harness_debate_consensus",
				properties: {
					...base,
					debate_id: String(data.debate_id ?? runId),
					consensus_id:
						typeof data.debate_id === "string" ? data.debate_id : runId,
					outcome: String(kind),
				},
			};
		}
		return {
			event: "harness_debate_round",
			properties: {
				...base,
				debate_id: String(data.debate_id ?? runId),
				round_index: Number(data.round_index ?? data.round ?? 0),
				round: Number(data.round_index ?? data.round ?? 0),
				outcome: String(kind ?? "round"),
			},
		};
	}

	if (customType === "harness-consensus-packet") {
		return {
			event: "harness_debate_consensus",
			properties: {
				...base,
				debate_id: String(data.debate_id ?? runId),
				consensus_id:
					typeof data.consensus_id === "string"
						? data.consensus_id
						: String(data.debate_id ?? runId),
			},
		};
	}

	if (customType === "harness-test-integrity-flag") {
		const paths = Array.isArray(data.file_path)
			? data.file_path
			: data.file_path
				? [data.file_path]
				: [];
		return {
			event: "harness_test_integrity_flag",
			properties: {
				...base,
				flag_type: String(data.severity ?? data.reasons ?? "integrity"),
				path_count: paths.length,
			},
		};
	}

	if (customType === "harness-budget-soft-limit") {
		return {
			event: "harness_budget_soft_limit",
			properties: {
				...base,
				tokens_used: Number(data.totalUsed ?? data.phaseUsed ?? 0),
				limit: Number(data.totalCap ?? data.phaseCap ?? 0),
			},
		};
	}

	if (customType === "harness-budget-exhausted") {
		return {
			event: "harness_budget_exhausted",
			properties: {
				...base,
				tokens_used: Number(data.budget_used ?? 0),
				limit: Number(
					(data.caps as { debate_global_cap?: number } | undefined)
						?.debate_global_cap ?? 0,
				),
			},
		};
	}

	if (customType === "harness-review-integrity-block") {
		return {
			event: "harness_review_integrity_block",
			properties: {
				...base,
				executor_session: String(
					data.executorSessionId ?? data.executor_session ?? "",
				),
				reviewer_session: distinctId,
			},
		};
	}

	if (customType === "harness-drift-report") {
		return {
			event: "harness_drift_report",
			properties: {
				...base,
				drift_score: Number(data.drift_score ?? 0),
				delta_summary: String(data.delta_summary ?? ""),
			},
		};
	}

	if (customType === "harness-eval-verdict") {
		return {
			event: "harness_eval_verdict",
			properties: {
				...base,
				verdict: String(data.verdict ?? data.decision ?? "unknown"),
				schema_version: String(data.schema_version ?? "1.0.0"),
			},
		};
	}

	if (customType === "harness-sentrux-signal") {
		return {
			event: "harness_sentrux_signal",
			properties: {
				...base,
				signal_type: String(data.signal_type ?? "unknown"),
				score: Number(data.score ?? 0),
			},
		};
	}

	return {
		event: mapped,
		properties: {
			...base,
			reason: String(data.reason ?? data.abortReason ?? ""),
			violation_type: String(data.violation_type ?? customType),
			tool_name: String(data.tool_name ?? ""),
		},
	};
}

export default function harnessTelemetry(pi: ExtensionAPI) {
	if (!isHarnessProjectEnabled()) return;
	const flushedHashes = new Set<string>();
	let lastPolicyPhase: HarnessPhase | null = null;

	pi.on("agent_start", async (_event, ctx) => {
		lastPolicyPhase = getPolicyState(ctx)?.phase ?? null;
	});

	pi.on("agent_end", async (_event, ctx) => {
		const distinctId = ctx.sessionManager.getSessionId();
		const trace = getTraceState(ctx);
		const policy = getPolicyState(ctx);

		const entries = ctx.sessionManager.getEntries() as SessionEntryLike[];
		for (const entry of entries) {
			if (entry.type !== "custom" || !entry.customType) continue;
			const customType = entry.customType;
			const data = (entry.data ?? {}) as Record<string, unknown>;
			const digest = hashEntry(customType, data);
			if (flushedHashes.has(digest)) continue;

			if (customType === "harness-policy-state") {
				const phase = policy?.phase ?? "plan";
				if (lastPolicyPhase && lastPolicyPhase !== phase) {
					data.previous_phase = lastPolicyPhase;
				}
				lastPolicyPhase = phase;
			}

			const mapped = mapCustomEntry(
				customType,
				data,
				trace,
				policy,
				distinctId,
			);
			if (mapped) {
				captureHarnessEvent(distinctId, mapped.event, mapped.properties);
				flushedHashes.add(digest);
			}
		}

		for (let i = entries.length - 1; i >= 0; i--) {
			const entry = entries[i];
			if (entry.type !== "custom") continue;
			if (entry.customType !== "harness-run-record") continue;
			const record = (entry.data ?? {}) as Record<string, unknown> & {
				cost?: {
					input_tokens?: number;
					output_tokens?: number;
				};
				tool_spans?: unknown[];
			};
			const digest = hashEntry(entry.customType, record);
			if (flushedHashes.has(digest)) break;

			const runId =
				typeof record.run_id === "string" ? record.run_id : trace?.run_id;
			if (!runId) break;

			captureHarnessEvent(distinctId, "harness_run_completed", {
				...propsFromRun(
					distinctId,
					runId,
					String(record.plan_id ?? trace?.plan_id ?? "plan-unknown"),
					(record.phase as HarnessPhase) ?? trace?.phase ?? "plan",
					{
						model: String(record.model ?? ctx.model?.id ?? "unknown"),
						thinking_level: String(record.thinking_level ?? "off"),
						tool_span_count: Number(
							record.tool_span_count ??
								(Array.isArray(record.tool_spans)
									? record.tool_spans.length
									: 0),
						),
						input_tokens: Number(record.cost?.input_tokens ?? 0),
						output_tokens: Number(record.cost?.output_tokens ?? 0),
						duration_ms: Number(record.duration_ms ?? 0),
					},
				),
			});
			flushedHashes.add(digest);
			break;
		}

		await shutdownHarnessPostHog();
	});

	pi.registerCommand("harness-telemetry-status", {
		description: "Show harness PostHog telemetry configuration",
		handler: async (_args, ctx) => {
			const lines = [
				"Harness telemetry:",
				`  HARNESS_TELEMETRY_ENABLED: ${process.env.HARNESS_TELEMETRY_ENABLED ?? "(default on)"}`,
				`  POSTHOG_ENABLED: ${process.env.POSTHOG_ENABLED ?? "(default on)"}`,
				`  POSTHOG_API_KEY: ${process.env.POSTHOG_API_KEY ? "set" : "missing"}`,
				`  POSTHOG_PRIVACY_MODE: ${process.env.POSTHOG_PRIVACY_MODE ?? "false"}`,
				`  flushed entries this session: ${flushedHashes.size}`,
			];
			if (ctx.hasUI) {
				ctx.ui.notify(lines.join("\n"), "info");
				return;
			}
			pi.sendMessage({
				customType: "harness-telemetry-status",
				content: lines.join("\n"),
				display: true,
			});
		},
	});
}
