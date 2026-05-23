/**
 * Consolidated vs threaded Review Gate strategy for plan-phase debate.
 */

import type {
	DebateEligibilityResult,
	PlanReviewGateStrategy,
} from "./plan-debate-eligibility.js";
import type { PlanDebateFocus } from "./plan-debate-focus.js";

export type { PlanReviewGateStrategy };

export const CONSOLIDATED_REVIEW_ROUND = 1;
export const CONSOLIDATED_REVIEW_ARTIFACT =
	"artifacts/review-round-consolidated.yaml";

export function planReviewGateStrategyFromEligibility(
	eligibility: DebateEligibilityResult,
): PlanReviewGateStrategy {
	return (
		eligibility.review_gate_strategy ?? {
			mode: eligibility.profile === "fast" ? "consolidated" : "threaded",
			profile: eligibility.profile,
			required_focuses: [...eligibility.required_focuses],
			min_focus_rounds: eligibility.min_focus_rounds,
			max_rounds: eligibility.max_rounds,
			max_exchanges_per_round: eligibility.max_exchanges_per_round,
			round_token_cap: eligibility.round_token_cap,
			debate_global_cap: eligibility.debate_global_cap,
			rationale: [...eligibility.rationale],
		}
	);
}

export function isConsolidatedReviewStrategy(
	strategy: PlanReviewGateStrategy,
): boolean {
	return strategy.mode === "consolidated";
}

export { PARALLEL_PROBES_REVIEW_ARTIFACT } from "./plan-debate-lanes.js";

export function isParallelProbesReviewStrategy(
	strategy: PlanReviewGateStrategy,
): boolean {
	return strategy.mode === "parallel_probes";
}

/** Focus areas covered in a single consolidated review round (spec + quality gate). */
export const CONSOLIDATED_REVIEW_FOCUS_AREAS: readonly PlanDebateFocus[] = [
	"spec",
	"quality",
];

export function consolidatedReviewFocusesSatisfied(
	covered: readonly string[],
): boolean {
	return CONSOLIDATED_REVIEW_FOCUS_AREAS.every((f) => covered.includes(f));
}
