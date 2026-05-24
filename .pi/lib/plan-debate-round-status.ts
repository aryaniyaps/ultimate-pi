/**
 * Round-level debate readiness for parent orchestration.
 */

import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { capsForDebate } from "./debate-bus-core.js";
import {
	type PlanDebateRoundFocus,
	readDebateRoundFocus,
} from "./plan-debate-focus.js";
import { planDebateIdForRun } from "./plan-debate-id.js";
import { laneArtifactPath } from "./plan-debate-lane.js";
import {
	lanesForConsolidatedRound,
	lanesForRound,
} from "./plan-debate-lanes.js";
import {
	getMessengerRoundState,
	loadMessengerState,
	messengerRoundDialogueReady,
} from "./plan-messenger.js";

async function exists(path: string): Promise<boolean> {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

export interface RoundStatusResult {
	round_index: number;
	/** Lane YAML + messenger dialogue complete; spawn integrator next. */
	ready_for_integrator: boolean;
	/** review-round-rN.yaml on disk (call harness_debate_submit_round if bus not updated). */
	review_round_on_disk: boolean;
	missing: string[];
	next_tool?: string;
	messenger: { ok: boolean; errors: string[] };
	dialogue: { ok: boolean; errors: string[] };
	unresolved_claim_ids: string[];
	exchange_count: number;
	debate_round_focus?: PlanDebateRoundFocus | null;
}

export async function getPlanDebateRoundStatus(
	runDir: string,
	roundIndex: number,
	runId?: string,
	opts?: { debate_round_focus?: PlanDebateRoundFocus },
): Promise<RoundStatusResult> {
	const messengerState = await loadMessengerState(runDir);
	const consolidated =
		messengerState?.review_gate_mode === "consolidated" && roundIndex === 1;
	const focus =
		opts?.debate_round_focus ??
		(consolidated ? ("all" as PlanDebateRoundFocus) : null) ??
		(await readDebateRoundFocus(runDir, roundIndex));
	const missing: string[] = [];
	const laneList = consolidated
		? lanesForConsolidatedRound()
		: lanesForRound(roundIndex, focus);
	for (const lane of laneList) {
		const rel = laneArtifactPath(lane, roundIndex);
		if (!(await exists(join(runDir, rel)))) {
			missing.push(rel);
		}
	}
	const profile = messengerState?.debate_profile;
	const caps = capsForDebate(
		runId ? planDebateIdForRun(runId) : `plan-${runId ?? "unknown"}`,
		profile,
	);
	const roundState = await getMessengerRoundState(runDir, roundIndex);
	const dialogueOpts = {
		max_exchanges_per_round: caps.max_exchanges_per_round,
	};
	const dialogue = messengerRoundDialogueReady(roundState, dialogueOpts);
	if (!dialogue.ok) {
		missing.push(...dialogue.errors.map((e) => `messenger: ${e}`));
	}
	const reviewRound = consolidated
		? "artifacts/review-round-consolidated.yaml"
		: `artifacts/review-round-r${roundIndex}.yaml`;
	const reviewRoundOnDisk = await exists(join(runDir, reviewRound));

	let next_tool: string | undefined;
	if (missing.some((m) => m.includes("hypothesis-validation"))) {
		next_tool = "subagent harness/planning/hypothesis-validator";
	} else if (missing.some((m) => m.includes("validation-turn"))) {
		next_tool = "subagent harness/planning/plan-evaluator";
	} else if (
		missing.some((m) => m.includes("adversary-brief")) &&
		!roundState?.evaluator_posted
	) {
		next_tool = "subagent harness/planning/plan-evaluator";
	} else if (missing.some((m) => m.includes("adversary-brief"))) {
		next_tool =
			"harness_messenger_read_round then subagent harness/planning/plan-adversary";
	} else if (missing.some((m) => m.includes("sprint-audit"))) {
		next_tool = "subagent harness/planning/sprint-contract-auditor";
	} else if (
		roundState &&
		roundState.evaluator_posted &&
		!roundState.adversary_posted
	) {
		next_tool =
			"harness_messenger_read_round then subagent harness/planning/plan-adversary";
	} else if (
		roundState &&
		roundState.unresolved_claim_ids.length > 0 &&
		roundState.exchange_count < caps.max_exchanges_per_round
	) {
		const spawnEvaluator = roundState.exchange_count % 2 === 1;
		next_tool = spawnEvaluator
			? "harness_debate_advance_thread → harness_messenger_read_round → subagent harness/planning/plan-evaluator (clarification; address unresolved claim_ids)"
			: "harness_debate_advance_thread → harness_messenger_read_round → subagent harness/planning/plan-adversary (counter or concede)";
	} else if (!dialogue.ok) {
		next_tool =
			"harness_debate_advance_thread or harness_debate_apply_lane (evaluator/adversary)";
	} else if (!reviewRoundOnDisk) {
		next_tool =
			"subagent harness/planning/review-integrator then harness_debate_submit_round";
	} else {
		next_tool =
			"harness_debate_submit_round with integrator draft from review-round file";
	}

	const laneMissing = missing.filter((m) => !m.startsWith("messenger"));
	const readyForIntegrator =
		dialogue.ok && laneMissing.length === 0 && !reviewRoundOnDisk;

	return {
		round_index: roundIndex,
		ready_for_integrator: readyForIntegrator,
		review_round_on_disk: reviewRoundOnDisk,
		missing,
		next_tool,
		messenger: dialogue,
		dialogue,
		unresolved_claim_ids: roundState?.unresolved_claim_ids ?? [],
		exchange_count: roundState?.exchange_count ?? 0,
		debate_round_focus: focus,
	};
}
