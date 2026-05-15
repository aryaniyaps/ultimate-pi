/**
 * drift-monitor — interactive replan/proceed flow when plan drift is high.
 *
 * Emits harness-drift-report custom entries for harness-telemetry + observation bus.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type HarnessPhase = "plan" | "execute" | "evaluate" | "adversary" | "merge";

interface DriftState {
	baseline_plan_id: string | null;
	drift_score: number;
	last_report_at: string | null;
	user_acknowledged: boolean;
}

interface SessionEntryLike {
	type?: string;
	customType?: string;
	data?: Record<string, unknown>;
}

const DRIFT_THRESHOLD = Number(process.env.HARNESS_DRIFT_THRESHOLD ?? "0.65");

function nowIso(): string {
	return new Date().toISOString();
}

function restoreDriftState(ctx: {
	sessionManager: { getEntries(): unknown[] };
}): DriftState {
	const entries = ctx.sessionManager.getEntries() as SessionEntryLike[];
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type !== "custom" || entry.customType !== "harness-drift-state")
			continue;
		const data = entry.data ?? {};
		return {
			baseline_plan_id:
				typeof data.baseline_plan_id === "string"
					? data.baseline_plan_id
					: null,
			drift_score: Number(data.drift_score ?? 0),
			last_report_at:
				typeof data.last_report_at === "string" ? data.last_report_at : null,
			user_acknowledged: Boolean(data.user_acknowledged),
		};
	}
	return {
		baseline_plan_id: null,
		drift_score: 0,
		last_report_at: null,
		user_acknowledged: false,
	};
}

function getPolicyPlanId(ctx: {
	sessionManager: { getEntries(): unknown[] };
}): string | null {
	const entries = ctx.sessionManager.getEntries() as SessionEntryLike[];
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type !== "custom" || entry.customType !== "harness-policy-state")
			continue;
		const planId = entry.data?.planId;
		return typeof planId === "string" ? planId : null;
	}
	return null;
}

function getPhase(ctx: {
	sessionManager: { getEntries(): unknown[] };
}): HarnessPhase {
	const entries = ctx.sessionManager.getEntries() as SessionEntryLike[];
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type !== "custom" || entry.customType !== "harness-policy-state")
			continue;
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
	return "execute";
}

function estimateDrift(
	baseline: string | null,
	current: string | null,
	phase: HarnessPhase,
): { score: number; summary: string } {
	if (!baseline || !current) {
		return { score: 0, summary: "No baseline plan id yet." };
	}
	if (baseline === current) {
		return { score: 0, summary: "Plan id matches baseline." };
	}
	const score = phase === "execute" ? 0.85 : phase === "evaluate" ? 0.7 : 0.55;
	return {
		score,
		summary: `Plan drift detected: baseline=${baseline}, current=${current}, phase=${phase}.`,
	};
}

export default function driftMonitor(pi: ExtensionAPI) {
	let state = restoreDriftState({
		sessionManager: { getEntries: () => [] },
	});

	pi.on("before_agent_start", async (event, ctx) => {
		state = restoreDriftState(ctx);
		const currentPlanId = getPolicyPlanId(ctx);
		if (!state.baseline_plan_id && currentPlanId) {
			state.baseline_plan_id = currentPlanId;
			state.drift_score = 0;
			state.user_acknowledged = false;
			pi.appendEntry("harness-drift-state", state);
			return undefined;
		}

		const { score, summary } = estimateDrift(
			state.baseline_plan_id,
			currentPlanId,
			getPhase(ctx),
		);
		state.drift_score = score;

		if (score < DRIFT_THRESHOLD || state.user_acknowledged) {
			pi.appendEntry("harness-drift-state", state);
			return undefined;
		}

		const promptLower = event.prompt.toLowerCase();
		if (
			promptLower.includes("harness-drift-proceed") ||
			promptLower.includes("proceed despite drift")
		) {
			state.user_acknowledged = true;
			state.last_report_at = nowIso();
			pi.appendEntry("harness-drift-state", state);
			return {
				systemPrompt: `${event.systemPrompt}\n\n[DriftMonitor] User acknowledged drift; proceeding.`,
			};
		}

		if (
			promptLower.includes("harness-drift-replan") ||
			promptLower.includes("/harness-plan")
		) {
			state.baseline_plan_id = currentPlanId;
			state.drift_score = 0;
			state.user_acknowledged = false;
			state.last_report_at = nowIso();
			pi.appendEntry("harness-drift-state", state);
			return undefined;
		}

		state.last_report_at = nowIso();
		pi.appendEntry("harness-drift-state", state);
		pi.appendEntry("harness-drift-report", {
			run_id: ctx.sessionManager.getSessionId(),
			plan_id: currentPlanId,
			phase: getPhase(ctx),
			drift_score: score,
			delta_summary: summary,
			threshold: DRIFT_THRESHOLD,
			requires_user_ack: true,
		});

		return {
			message: {
				customType: "harness-drift-interactive",
				display: true,
				content: [
					`High plan drift detected (score=${score.toFixed(2)}, threshold=${DRIFT_THRESHOLD}).`,
					summary,
					"Reply with harness-drift-replan to replan, or harness-drift-proceed to continue with explicit acknowledgment.",
				].join("\n"),
			},
			systemPrompt: `${event.systemPrompt}\n\n[DriftMonitor] Drift gate active until user replans or explicitly proceeds.`,
		};
	});

	pi.registerCommand("harness-drift-status", {
		description: "Show harness drift monitor state",
		handler: async (_args, ctx) => {
			state = restoreDriftState(ctx);
			const lines = [
				"Harness drift monitor:",
				`  baseline_plan_id: ${state.baseline_plan_id ?? "none"}`,
				`  current_plan_id: ${getPolicyPlanId(ctx) ?? "none"}`,
				`  drift_score: ${state.drift_score}`,
				`  threshold: ${DRIFT_THRESHOLD}`,
				`  user_acknowledged: ${state.user_acknowledged}`,
			];
			if (ctx.hasUI) {
				ctx.ui.notify(lines.join("\n"), "info");
				return;
			}
			pi.sendMessage({
				customType: "harness-drift-status",
				content: lines.join("\n"),
				display: true,
			});
		},
	});
}
