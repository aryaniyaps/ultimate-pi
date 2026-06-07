/**
 * Consolidated vs threaded Review Gate strategy for plan-phase debate.
 */

import type { capsForDebate } from "./debate-bus-core.js";
import type {
	DebateEligibilityResult,
	DebateProfile,
	PlanReviewGateStrategy,
} from "./plan-debate-eligibility.js";
import type { PlanDebateFocus } from "./plan-debate-focus.js";
import type { MessengerState } from "./plan-messenger.js";

export type { PlanReviewGateStrategy };
export type ReviewGateMode = PlanReviewGateStrategy["mode"];

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

/** Single SSOT: profile → messenger review_gate_mode. */
export function planReviewGateModeForProfile(
	profile: DebateProfile,
): ReviewGateMode {
	if (profile === "fast") return "consolidated";
	if (profile === "standard") return "parallel_probes";
	return "threaded";
}

/** parallel_probes and consolidated submit one round — cap min_focus_rounds. */
export function effectiveMinFocusRounds(
	strategy: PlanReviewGateStrategy,
): number {
	if (strategy.mode === "parallel_probes" || strategy.mode === "consolidated") {
		return 1;
	}
	return strategy.min_focus_rounds;
}

export function reviewStrategyFromMessenger(
	messenger: MessengerState,
	profile: DebateProfile,
	requiredFocuses: readonly PlanDebateFocus[],
	caps: ReturnType<typeof capsForDebate>,
): PlanReviewGateStrategy {
	const mode =
		messenger.review_gate_mode ?? planReviewGateModeForProfile(profile);
	return {
		mode,
		profile,
		required_focuses: [...requiredFocuses],
		min_focus_rounds: effectiveMinFocusRounds({
			mode,
			profile,
			required_focuses: [...requiredFocuses],
			min_focus_rounds: caps.min_focus_rounds,
			max_rounds: caps.max_rounds,
			max_exchanges_per_round: caps.max_exchanges_per_round,
			round_token_cap: caps.round_token_cap,
			debate_global_cap: caps.debate_global_cap,
			rationale: [],
		}),
		max_rounds: caps.max_rounds,
		max_exchanges_per_round: caps.max_exchanges_per_round,
		round_token_cap: caps.round_token_cap,
		debate_global_cap: caps.debate_global_cap,
		rationale: messenger.review_gate_mode
			? [`messenger review_gate_mode=${messenger.review_gate_mode}`]
			: [],
	};
}
