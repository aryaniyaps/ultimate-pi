/**
 * Shared Review Gate lane list for a round (gate + round-status).
 */

import type { PlanDebateRoundFocus } from "./plan-debate-focus.js";
import type { DebateLaneKind } from "./plan-debate-lane.js";

/** Lanes required before review-integrator for this round. */
export function lanesForRound(
	roundIndex: number,
	debateRoundFocus?: PlanDebateRoundFocus | null,
): DebateLaneKind[] {
	const lanes: DebateLaneKind[] = ["validation-turn", "adversary-brief"];
	if (roundIndex === 1) {
		lanes.unshift("hypothesis-validation");
	}
	if (roundIndex >= 4 || debateRoundFocus === "quality") {
		lanes.push("sprint-audit");
	}
	return lanes;
}

/** Relative artifact paths for lane YAML + review-round. */
export function laneArtifactPathsForRound(
	roundIndex: number,
	debateRoundFocus?: PlanDebateRoundFocus | null,
): string[] {
	const paths = lanesForRound(roundIndex, debateRoundFocus).map((lane) => {
		switch (lane) {
			case "hypothesis-validation":
				return `artifacts/hypothesis-validation-r${roundIndex}.yaml`;
			case "validation-turn":
				return `artifacts/validation-turn-r${roundIndex}.yaml`;
			case "adversary-brief":
				return `artifacts/adversary-brief-r${roundIndex}.yaml`;
			case "sprint-audit":
				return `artifacts/sprint-audit-r${roundIndex}.yaml`;
			default:
				return `artifacts/${lane}-r${roundIndex}.yaml`;
		}
	});
	paths.push(`artifacts/review-round-r${roundIndex}.yaml`);
	return paths;
}

/** Lanes for consolidated Review Gate (single round, parallel-friendly). */
export function lanesForConsolidatedRound(): DebateLaneKind[] {
	return ["validation-turn", "adversary-brief", "sprint-audit"];
}

export function laneArtifactPathsForConsolidatedRound(): string[] {
	const roundIndex = 1;
	return [
		...lanesForConsolidatedRound().map((lane) => {
			switch (lane) {
				case "validation-turn":
					return `artifacts/validation-turn-r${roundIndex}.yaml`;
				case "adversary-brief":
					return `artifacts/adversary-brief-r${roundIndex}.yaml`;
				case "sprint-audit":
					return `artifacts/sprint-audit-r${roundIndex}.yaml`;
				default:
					return `artifacts/${lane}-r${roundIndex}.yaml`;
			}
		}),
		"artifacts/review-round-consolidated.yaml",
	];
}
