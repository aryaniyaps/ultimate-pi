/**
 * Canonical plan-phase debate identifiers (ADR-0035).
 */

export function planDebateIdForRun(runId: string): string {
	const trimmed = runId.trim();
	if (!trimmed) throw new Error("run_id is required for plan debate");
	return `plan-${trimmed}`;
}

/** Accept plan-<run_id> only; rewrite plan-<plan_id> when run_id is known. */
export function normalizePlanDebateId(
	rawDebateId: string,
	runId: string,
): { debateId: string; corrected: boolean; warning?: string } {
	const trimmed = rawDebateId.trim();
	const canonical = planDebateIdForRun(runId);
	if (!trimmed) {
		return { debateId: canonical, corrected: true, warning: "empty debate id" };
	}
	if (trimmed === canonical) {
		return { debateId: canonical, corrected: false };
	}
	if (trimmed.startsWith("plan-") && trimmed !== canonical) {
		return {
			debateId: canonical,
			corrected: true,
			warning: `debate id must be plan-<run_id>; got ${trimmed}, using ${canonical}`,
		};
	}
	if (!trimmed.startsWith("plan-")) {
		return {
			debateId: trimmed,
			corrected: false,
			warning: "non-plan debate id (post-execute profile)",
		};
	}
	return { debateId: trimmed, corrected: false };
}
