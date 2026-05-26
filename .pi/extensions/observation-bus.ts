/**
 * observation-bus — normalize harness signals into HarnessObservation envelopes.
 *
 * Other extensions may append harness-observation entries; this bus re-emits
 * structured observations for Sentrux, drift-monitor, and harness-telemetry.
 */

import { randomUUID } from "node:crypto";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isHarnessProjectEnabled } from "../lib/harness-project-config.js";
import { getRunIdFromSession } from "../lib/harness-run-context.js";

type HarnessPhase = "plan" | "execute" | "evaluate" | "adversary" | "merge";
type ObservationKind =
	| "policy"
	| "budget"
	| "integrity"
	| "debate"
	| "drift"
	| "eval"
	| "sentrux"
	| "ls-lint"
	| "trace";
type ObservationSource =
	| "policy-gate"
	| "budget-guard"
	| "trace-recorder"
	| "review-integrity"
	| "test-diff-integrity"
	| "debate-orchestrator"
	| "drift-monitor"
	| "sentrux"
	| "ls-lint"
	| "evaluator"
	| "harness-telemetry";

interface SessionEntryLike {
	type?: string;
	customType?: string;
	data?: Record<string, unknown>;
}

const SOURCE_BY_CUSTOM: Record<string, ObservationSource> = {
	"harness-policy-state": "policy-gate",
	"harness-policy-violation": "policy-gate",
	"harness-policy-aborted": "policy-gate",
	"harness-budget-soft-limit": "budget-guard",
	"harness-budget-exhausted": "budget-guard",
	"harness-review-integrity": "review-integrity",
	"harness-review-integrity-block": "review-integrity",
	"harness-test-integrity-flag": "test-diff-integrity",
	"harness-debate-envelope": "debate-orchestrator",
	"harness-consensus-packet": "debate-orchestrator",
	"harness-drift-report": "drift-monitor",
	"harness-eval-verdict": "evaluator",
	"harness-sentrux-signal": "sentrux",
	"harness-ls-lint-signal": "ls-lint",
	"harness-run-record": "trace-recorder",
};

const KIND_BY_CUSTOM: Record<string, ObservationKind> = {
	"harness-policy-state": "policy",
	"harness-policy-violation": "policy",
	"harness-policy-aborted": "policy",
	"harness-budget-soft-limit": "budget",
	"harness-budget-exhausted": "budget",
	"harness-review-integrity": "integrity",
	"harness-review-integrity-block": "integrity",
	"harness-test-integrity-flag": "integrity",
	"harness-debate-envelope": "debate",
	"harness-consensus-packet": "debate",
	"harness-drift-report": "drift",
	"harness-eval-verdict": "eval",
	"harness-sentrux-signal": "sentrux",
	"harness-ls-lint-signal": "ls-lint",
	"harness-run-record": "trace",
};

function nowIso(): string {
	return new Date().toISOString();
}

function getRunId(ctx: {
	sessionManager: { getEntries(): unknown[]; getSessionId(): string };
}): string {
	return (
		getRunIdFromSession(
			ctx.sessionManager.getEntries(),
			ctx.sessionManager.getSessionId(),
		) ?? ctx.sessionManager.getSessionId()
	);
}

export default function observationBus(pi: ExtensionAPI) {
	if (!isHarnessProjectEnabled()) return;
	const seen = new Set<string>();

	pi.on("agent_end", async (_event, ctx) => {
		const entries = ctx.sessionManager.getEntries() as SessionEntryLike[];
		const runId = getRunId(ctx);

		for (const entry of entries) {
			if (entry.type !== "custom" || !entry.customType) continue;
			if (entry.customType === "harness-observation") continue;

			const source = SOURCE_BY_CUSTOM[entry.customType];
			const kind = KIND_BY_CUSTOM[entry.customType];
			if (!source || !kind) continue;

			const key = `${entry.customType}:${JSON.stringify(entry.data ?? {})}`;
			if (seen.has(key)) continue;
			seen.add(key);

			const data = entry.data ?? {};
			const phase = data.phase as HarnessPhase | undefined;
			const observation = {
				schema_version: "1.0.0",
				contract_version: "1.0.0",
				observation_id: randomUUID(),
				run_id: runId,
				plan_id: typeof data.plan_id === "string" ? data.plan_id : undefined,
				phase,
				source,
				kind,
				timestamp: nowIso(),
				severity:
					entry.customType.includes("block") ||
					entry.customType.includes("exhausted")
						? "high"
						: "info",
				payload: data,
			};

			pi.appendEntry("harness-observation", observation);
		}
	});

	pi.registerCommand("harness-observation-last", {
		description: "Show the latest harness observation envelope",
		handler: async (_args, ctx) => {
			const entries = ctx.sessionManager.getEntries() as SessionEntryLike[];
			for (let i = entries.length - 1; i >= 0; i--) {
				const entry = entries[i];
				if (
					entry.type !== "custom" ||
					entry.customType !== "harness-observation"
				)
					continue;
				const msg = JSON.stringify(entry.data, null, 2);
				if (ctx.hasUI) {
					ctx.ui.notify(msg, "info");
					return;
				}
				pi.sendMessage({
					customType: "harness-observation-last",
					content: msg,
					display: true,
				});
				return;
			}
			if (ctx.hasUI) ctx.ui.notify("No observations yet.", "warning");
		},
	});
}
