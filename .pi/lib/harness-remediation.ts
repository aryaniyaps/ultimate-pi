/**
 * Review remediation classification — shared by run-context and repair-brief.
 */

export type RemediationClass =
	| "pass"
	| "implementation_gap"
	| "plan_gap"
	| "rollback"
	| "inconclusive";

export interface ReviewOutcomeLike {
	schema_version?: string;
	status?: string;
	remediation_class?: RemediationClass | string;
	recommended_next?: string;
}

export interface EvalVerdictLike {
	status?: string;
	recommended_action?: string;
	failed_checks?: string[];
}

/** Infer remediation when parent skipped Phase 6 but eval-verdict exists on disk. */
export function remediationClassFromEvalVerdict(
	verdict: EvalVerdictLike | null,
): RemediationClass | null {
	if (!verdict) return null;
	const status = (verdict.status ?? "").toLowerCase();
	if (status === "pass") return "pass";
	const action = (verdict.recommended_action ?? "").toLowerCase();
	if (
		action === "replan" ||
		action.includes("revise") ||
		action.includes("plan")
	) {
		return "plan_gap";
	}
	if (action === "rollback" || action.includes("rollback")) {
		return "rollback";
	}
	if (
		action === "steer" ||
		action === "repair" ||
		action.includes("implement")
	) {
		return "implementation_gap";
	}
	const joined = Array.isArray(verdict.failed_checks)
		? verdict.failed_checks.join(" ").toLowerCase()
		: "";
	if (
		joined.includes("scope_minimization") ||
		joined.includes("scope_drift") ||
		joined.includes("replan")
	) {
		return "plan_gap";
	}
	if (status === "fail") return "inconclusive";
	return null;
}

export function recommendedNextForRemediation(
	remediation: RemediationClass,
): string {
	switch (remediation) {
		case "pass":
			return "/harness-policy-status";
		case "implementation_gap":
			return "/harness-steer";
		case "plan_gap":
			return "/harness-plan (mode: revise)";
		case "rollback":
			return "/harness-incident";
		default:
			return "/harness-review";
	}
}
