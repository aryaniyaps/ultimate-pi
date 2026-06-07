/**
 * Phase worker resume eligibility (HARNESS_PHASE_WORKER=1 spike).
 * Never resume across evaluator ↔ adversary — preserves generator–evaluator isolation.
 */

const DEBATE_ISOLATION_PAIRS = new Set([
	"harness/planning/plan-evaluator",
	"harness/planning/plan-adversary",
]);

export function isHarnessPhaseWorkerEnabled(): boolean {
	return process.env.HARNESS_PHASE_WORKER === "1";
}

export function phaseWorkerResumeEligible(
	priorAgent: string | null,
	nextAgent: string,
): boolean {
	if (!isHarnessPhaseWorkerEnabled()) return false;
	if (!priorAgent || priorAgent !== nextAgent) return false;
	if (DEBATE_ISOLATION_PAIRS.has(nextAgent)) return false;
	return true;
}
