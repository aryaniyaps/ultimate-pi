/**
 * Round-level debate readiness for parent orchestration.
 */

import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { type DebateLaneKind, laneArtifactPath } from "./plan-debate-lane.js";
import {
	getMessengerRoundState,
	messengerRoundDebateReady,
} from "./plan-messenger.js";

async function exists(path: string): Promise<boolean> {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

function lanesForRound(roundIndex: number): DebateLaneKind[] {
	const lanes: DebateLaneKind[] = ["validation-turn", "adversary-brief"];
	if (roundIndex === 1) lanes.unshift("hypothesis-validation");
	if (roundIndex === 4) lanes.push("sprint-audit");
	return lanes;
}

export interface RoundStatusResult {
	round_index: number;
	/** Lane YAML + messenger thread complete; spawn integrator next. */
	ready_for_integrator: boolean;
	/** review-round-rN.yaml on disk (call harness_debate_submit_round if bus not updated). */
	review_round_on_disk: boolean;
	missing: string[];
	next_tool?: string;
	messenger: { ok: boolean; errors: string[] };
}

export async function getPlanDebateRoundStatus(
	runDir: string,
	roundIndex: number,
): Promise<RoundStatusResult> {
	const missing: string[] = [];
	for (const lane of lanesForRound(roundIndex)) {
		const rel = laneArtifactPath(lane, roundIndex);
		if (!(await exists(join(runDir, rel)))) {
			missing.push(rel);
		}
	}
	const roundState = await getMessengerRoundState(runDir, roundIndex);
	const messenger = messengerRoundDebateReady(roundState, roundIndex === 4);
	if (!messenger.ok) {
		missing.push(...messenger.errors.map((e) => `messenger: ${e}`));
	}
	const reviewRound = `artifacts/review-round-r${roundIndex}.yaml`;
	const reviewRoundOnDisk = await exists(join(runDir, reviewRound));

	let next_tool: string | undefined;
	if (missing.some((m) => m.includes("hypothesis-validation"))) {
		next_tool = "subagent harness/planning/hypothesis-validator";
	} else if (missing.some((m) => m.includes("validation-turn"))) {
		next_tool = "subagent harness/planning/plan-evaluator";
	} else if (missing.some((m) => m.includes("adversary-brief"))) {
		next_tool =
			"harness_messenger_read_round then subagent harness/planning/plan-adversary";
	} else if (missing.some((m) => m.includes("sprint-audit"))) {
		next_tool = "subagent harness/planning/sprint-contract-auditor";
	} else if (!messenger.ok) {
		next_tool =
			"harness_debate_apply_lane (evaluator/adversary) or re-spawn lane agent";
	} else if (!reviewRoundOnDisk) {
		next_tool =
			"subagent harness/planning/review-integrator then harness_debate_submit_round";
	} else {
		next_tool =
			"harness_debate_submit_round with integrator draft from review-round file";
	}

	const readyForIntegrator =
		messenger.ok &&
		missing.filter((m) => !m.startsWith("messenger")).length === 0 &&
		!reviewRoundOnDisk;

	return {
		round_index: roundIndex,
		ready_for_integrator: readyForIntegrator,
		review_round_on_disk: reviewRoundOnDisk,
		missing,
		next_tool,
		messenger,
	};
}
