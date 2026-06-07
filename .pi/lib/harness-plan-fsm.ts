/**
 * Plan-phase finite state machine — deterministic next action for parent orchestrator.
 */

import { join } from "node:path";
import { canAutoApprovePlan } from "./harness-auto-approve.js";
import { derivePlanRouteSpawns } from "./harness-plan-route.js";
import { validatePlanApprovalReadiness } from "./plan-approval-readiness.js";
import { loadPlanDebateEligibilitySnapshot } from "./plan-debate-eligibility-snapshot.js";
import { validatePlanDebateGate } from "./plan-debate-gate.js";
import { getPlanDebateRoundStatus } from "./plan-debate-round-status.js";
import { resolvePlanHumanGateStatus } from "./plan-human-gates.js";
import { loadMessengerState } from "./plan-messenger.js";
import { readTaskClarificationDoc } from "./plan-task-clarification.js";

export type PlanFsmActionKind = "spawn" | "tool" | "gate" | "wait_user";

export interface PlanFsmNextAction {
	phase: string;
	action: PlanFsmActionKind;
	agents?: string[];
	tool?: string;
	rationale: string[];
	review_gate_mode?: string;
	synthesis_route?: string;
}

export interface PlanFsmInput {
	projectRoot: string;
	runId: string;
	entries: unknown[];
	quick?: boolean;
	taskSummary?: string;
	lastOutcome?: string | null;
}

export async function derivePlanNextAction(
	input: PlanFsmInput,
): Promise<PlanFsmNextAction> {
	const { projectRoot, runId, entries } = input;
	const runDir = join(projectRoot, ".pi", "harness", "runs", runId);
	const gateStatus = await resolvePlanHumanGateStatus(
		projectRoot,
		runId,
		entries,
		{
			quick: input.quick,
			taskSummary: input.taskSummary,
			lastOutcome: input.lastOutcome,
		},
	);

	if (!gateStatus.phase0Ready) {
		return {
			phase: "0",
			action: gateStatus.phase0NeedsAskUser ? "wait_user" : "tool",
			tool: gateStatus.phase0NeedsAskUser
				? "ask_user"
				: "write_harness_yaml + harness_artifact_ready (task-clarification)",
			rationale: [
				gateStatus.nextRequiredAction ?? "Complete Phase 0 task clarification",
			],
		};
	}

	const clarDoc = await readTaskClarificationDoc(runDir);
	const resolvedRisk = String(clarDoc?.risk_level ?? "med");

	const route = await derivePlanRouteSpawns(runDir, {
		risk_level: resolvedRisk,
	});
	if (route.agents.length > 0) {
		return {
			phase: "2-4",
			action: "spawn",
			agents: route.agents,
			synthesis_route: route.route,
			rationale: route.rationale,
		};
	}

	const eligibility = await loadPlanDebateEligibilitySnapshot(runDir);
	const messenger = await loadMessengerState(runDir);
	if (!messenger) {
		return {
			phase: "5",
			action: "tool",
			tool: "harness_plan_debate_eligibility then harness_debate_open",
			rationale: ["Review Gate not opened — run eligibility then debate_open"],
			review_gate_mode: eligibility?.review_gate_strategy.mode,
		};
	}

	const roundStatus = await getPlanDebateRoundStatus(runDir, 1, runId);
	if (!roundStatus.ready_for_integrator && roundStatus.next_tool) {
		return {
			phase: "5",
			action: roundStatus.next_tool.startsWith("subagent") ? "spawn" : "tool",
			tool: roundStatus.next_tool.startsWith("subagent")
				? undefined
				: roundStatus.next_tool,
			agents: roundStatus.next_tool.includes("parallel batch")
				? ["harness/planning/plan-evaluator", "harness/planning/plan-adversary"]
				: roundStatus.next_tool.startsWith("subagent")
					? [
							roundStatus.next_tool.replace(/^subagent\s+/, "").split(" ")[0] ??
								"",
						]
					: undefined,
			review_gate_mode: messenger.review_gate_mode,
			rationale: [
				`Review Gate in progress (missing: ${roundStatus.missing.slice(0, 3).join(", ")})`,
			],
		};
	}

	if (gateStatus.debateRequired) {
		return {
			phase: "5",
			action: "tool",
			tool: "harness_debate_consensus",
			rationale: [
				gateStatus.debateRecoveryHint ??
					"Complete debate consensus before approval",
			],
			review_gate_mode: messenger.review_gate_mode,
		};
	}

	if (gateStatus.approvalRequired && !gateStatus.approvalRecorded) {
		const readiness = await validatePlanApprovalReadiness(projectRoot, runId, {
			risk_level: resolvedRisk,
		});
		const debateGate = await validatePlanDebateGate(
			projectRoot,
			runId,
			eligibility ?? undefined,
		);
		const auto = await canAutoApprovePlan({
			projectRoot,
			runId,
			riskLevel: resolvedRisk,
			readiness,
			debateGate,
		});
		return {
			phase: "6",
			action: auto.allowed ? "tool" : "gate",
			tool: auto.allowed ? "approve_plan (auto)" : "approve_plan",
			rationale: auto.allowed
				? ["deterministic gates pass — auto-approve eligible"]
				: ["plan ready — user approval required", ...auto.reasons],
		};
	}

	return {
		phase: "6",
		action: "tool",
		tool: "create_plan",
		rationale: ["plan approved — write plan-packet.yaml via create_plan"],
	};
}
