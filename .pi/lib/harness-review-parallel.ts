/**
 * Risk-based default for parallel review evaluator ∥ adversary.
 */

export interface ReviewParallelOpts {
	quick?: boolean;
	steerAttempt?: number;
}

export function isHarnessReviewParallelEnabled(
	opts?: ReviewParallelOpts,
): boolean {
	if (process.env.HARNESS_REVIEW_PARALLEL === "0") return false;
	if (process.env.HARNESS_REVIEW_PARALLEL === "1") return true;
	if (opts?.quick) return false;
	if ((opts?.steerAttempt ?? 0) >= 2) return false;
	return true;
}
