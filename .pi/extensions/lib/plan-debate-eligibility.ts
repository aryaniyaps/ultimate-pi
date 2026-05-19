/**
 * Pre-debate profile selection (full | standard | light).
 */

import { PLAN_FOCUS_AREAS, type PlanDebateFocus } from "./plan-debate-focus.js";

export type DebateProfile = "full" | "standard" | "light";

export interface DebateEligibilityInput {
	risk_level?: string;
	material_fork?: boolean;
	dag_pass?: boolean;
	dag_manually_patched?: boolean;
	implementation_brief?: Record<string, unknown> | null;
	stack_brief?: Record<string, unknown> | null;
	decomposition?: Record<string, unknown> | null;
}

export interface DebateEligibilityResult {
	profile: DebateProfile;
	required_focuses: PlanDebateFocus[];
	min_focus_rounds: number;
	max_rounds: number;
	max_exchanges_per_round: number;
	round_token_cap: number;
	debate_global_cap: number;
	human_required: boolean;
	rationale: string[];
}

const LIGHT_FOCUS: PlanDebateFocus[] = ["spec", "quality"];

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function strList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((item) => (typeof item === "string" ? item.trim() : ""))
		.filter(Boolean);
}

function implementationOpenQuestions(
	brief: Record<string, unknown> | null,
): string[] {
	if (!brief) return [];
	return strList(brief.open_questions);
}

function recommendedApproach(
	brief: Record<string, unknown> | null,
): Record<string, unknown> | null {
	return asRecord(brief?.recommended_approach);
}

function stackHasClearPrimary(stack: Record<string, unknown> | null): boolean {
	if (!stack) return false;
	const primary = stack.recommended_primary;
	return typeof primary === "string" && primary.trim().length > 0;
}

function confidenceAllowsLight(brief: Record<string, unknown> | null): boolean {
	const rec = recommendedApproach(brief);
	if (!rec) return false;
	const conf = String(rec.recommended_approach_confidence ?? "").toLowerCase();
	if (conf !== "high") return false;
	const rationale =
		typeof rec.confidence_rationale === "string"
			? rec.confidence_rationale.trim()
			: "";
	const refs = strList(rec.evidence_refs);
	if (!rationale || refs.length < 2) return false;
	if (implementationOpenQuestions(brief).length > 0) return false;
	const patterns = Array.isArray(brief?.solution_patterns)
		? (brief!.solution_patterns as unknown[])
		: [];
	for (const p of patterns) {
		const pat = asRecord(p);
		const risks = pat ? strList(pat.risks) : [];
		if (risks.some((r) => /unmitigated|critical|blocker/i.test(r))) {
			return false;
		}
	}
	const similar = Array.isArray(brief?.similar_implementations)
		? (brief!.similar_implementations as unknown[])
		: [];
	if (similar.length === 0) return false;
	return true;
}

function decompositionTensionCount(
	decomposition: Record<string, unknown> | null,
): number {
	if (!decomposition) return 0;
	return Array.isArray(decomposition.tensions)
		? decomposition.tensions.length
		: 0;
}

export const PLAN_BUDGET_STANDARD = {
	min_focus_rounds: 4,
	max_rounds: 12,
	max_exchanges_per_round: 3,
	round_token_cap: 8000,
	debate_global_cap: 80000,
} as const;

export const PLAN_BUDGET_LIGHT = {
	min_focus_rounds: 2,
	max_rounds: 8,
	max_exchanges_per_round: 3,
	round_token_cap: 6000,
	debate_global_cap: 40000,
} as const;

function capsForProfile(
	profile: DebateProfile,
): Omit<
	DebateEligibilityResult,
	"profile" | "required_focuses" | "human_required" | "rationale"
> {
	if (profile === "light") {
		return {
			...PLAN_BUDGET_LIGHT,
		};
	}
	return {
		...PLAN_BUDGET_STANDARD,
	};
}

/**
 * Select debate profile from pre-debate signals only (no R1 hypothesis output).
 */
export function harnessPlanDebateEligibility(
	input: DebateEligibilityInput,
): DebateEligibilityResult {
	const rationale: string[] = [];
	const risk = String(input.risk_level ?? "med").toLowerCase();
	const impl = input.implementation_brief ?? null;
	const stack = input.stack_brief ?? null;
	const openQs = implementationOpenQuestions(impl);
	const materialFork = input.material_fork === true;
	const dagPatched = input.dag_manually_patched === true;
	const dagFail = input.dag_pass === false;

	let human_required = false;

	if (dagFail) {
		rationale.push("DAG validation failed — use standard profile until fixed");
	}

	if (openQs.length > 0) {
		rationale.push(
			`implementation open_questions (${openQs.length}) — not eligible for light`,
		);
	}

	const conflictingPatterns =
		Array.isArray(impl?.solution_patterns) &&
		(impl!.solution_patterns as unknown[]).length >= 2 &&
		openQs.length > 0;
	if (conflictingPatterns) {
		human_required = true;
		rationale.push("conflicting external patterns with open questions");
	}

	let profile: DebateProfile = "standard";
	rationale.push("default profile: standard (fail-safe)");

	if (
		risk === "high" ||
		materialFork ||
		openQs.length > 0 ||
		dagPatched ||
		decompositionTensionCount(input.decomposition ?? null) >= 3
	) {
		profile = "full";
		rationale.push(
			"full: high risk, material fork, open questions, DAG patch, or tensions",
		);
	} else if (
		risk === "low" &&
		!materialFork &&
		!dagPatched &&
		input.dag_pass !== false &&
		confidenceAllowsLight(impl) &&
		stackHasClearPrimary(stack)
	) {
		profile = "light";
		rationale.push(
			"light: low risk, clear stack, high-confidence implementation approach",
		);
	} else if (risk === "med") {
		profile = "standard";
		rationale.push("standard: med risk default");
	}

	const required_focuses: PlanDebateFocus[] =
		profile === "light" ? [...LIGHT_FOCUS] : [...PLAN_FOCUS_AREAS];

	const caps = capsForProfile(profile);

	return {
		profile,
		required_focuses,
		...caps,
		human_required,
		rationale,
	};
}
