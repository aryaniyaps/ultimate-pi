/**
 * Review remediation classification — shared by run-context and repair-brief.
 */

export type RemediationClass =
	| "pass"
	| "implementation_gap"
	| "plan_gap"
	| "rollback"
	| "inconclusive";

export type GapKind = "hygiene" | "functional" | "mixed";

export interface ReviewOutcomeLike {
	schema_version?: string;
	status?: string;
	remediation_class?: RemediationClass | string;
	recommended_next?: string;
	eval_status?: string;
	adversary_status?: string;
	gap_kind?: GapKind;
}

export interface EvalVerdictLike {
	status?: string;
	recommended_action?: string;
	failed_checks?: string[];
}

export interface AdversaryVerdictLike {
	block_merge?: boolean;
	severity?: string;
	recommendation?: string;
	repro_steps?: string[];
	repro_commands?: ReproCommandLike[];
}

export interface ReproCommandLike {
	cmd: string;
	cwd?: string;
	safe_for_phase1?: boolean;
}

export interface BenchmarkLogLike {
	harness_verify?: string;
	ls_lint?: string;
	sentrux_check?: string;
	notes?: string;
	adversary_repro?: string;
}

const HYGIENE_CHECK_PATTERNS = [
	/lint_format/i,
	/biome/i,
	/format/i,
	/staged.?file/i,
	/git add/i,
	/ls.?lint/i,
	/filename/i,
	/hygiene/i,
	/prettier/i,
];

const FUNCTIONAL_CHECK_PATTERNS = [
	/acceptance/i,
	/test/i,
	/repro/i,
	/toctou/i,
	/race/i,
	/block_merge/i,
	/implementation/i,
	/functional/i,
	/widget/i,
	/resume/i,
];

const SHELL_CMD_PREFIX =
	/^(npx|node|npm|tsx|sg|python3?|biome|cargo|go|make)\b/i;

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
	opts?: { burst?: boolean },
): string {
	switch (remediation) {
		case "pass":
			return "/harness-policy-status";
		case "implementation_gap":
			if (opts?.burst) return "/harness-steer --burst";
			return "/harness-steer";
		case "plan_gap":
			return "/harness-plan (mode: revise)";
		case "rollback":
			return "/harness-incident";
		default:
			return "/harness-review";
	}
}

export function steerBurstFromEnv(): boolean {
	const raw = process.env.HARNESS_STEER_BURST?.trim();
	return raw === "1" || raw?.toLowerCase() === "true";
}

/** Whether burst steer is allowed for eval-pass + adversary block_merge. */
export function steerBurstAllowed(
	evalVerdict: EvalVerdictLike | null,
	adversary: AdversaryVerdictLike | null,
	inlineRepairAttempted?: boolean,
): boolean {
	if (!steerBurstFromEnv()) return false;
	if (inlineRepairAttempted) return false;
	const evalPass = (evalVerdict?.status ?? "").toLowerCase() === "pass";
	return evalPass && adversary?.block_merge === true;
}

export function effectiveSteerMaxAttempts(
	baseMax: number,
	burstAllowed: boolean,
): number {
	return burstAllowed ? baseMax + 1 : baseMax;
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
	const lower = text.toLowerCase();
	return patterns.some((p) => p.test(lower));
}

function collectFailureText(
	evalVerdict: EvalVerdictLike | null,
	adversary: AdversaryVerdictLike | null,
	benchmark: BenchmarkLogLike | null,
): string {
	const parts: string[] = [];
	if (Array.isArray(evalVerdict?.failed_checks)) {
		parts.push(...evalVerdict.failed_checks);
	}
	if (typeof evalVerdict?.recommended_action === "string") {
		parts.push(evalVerdict.recommended_action);
	}
	if (Array.isArray(adversary?.repro_steps)) {
		parts.push(...adversary.repro_steps);
	}
	if (typeof benchmark?.notes === "string") parts.push(benchmark.notes);
	if (benchmark?.ls_lint === "fail") parts.push("ls_lint_fail");
	if (benchmark?.harness_verify === "fail") parts.push("harness_verify_fail");
	return parts.join(" ");
}

/** Classify implementation_gap as hygiene-only, functional, or mixed. */
export function classifyImplementationGap(
	evalVerdict: EvalVerdictLike | null,
	adversary: AdversaryVerdictLike | null,
	benchmark: BenchmarkLogLike | null,
): GapKind {
	const text = collectFailureText(evalVerdict, adversary, benchmark);
	const hygiene = matchesAny(text, HYGIENE_CHECK_PATTERNS);
	const functional =
		matchesAny(text, FUNCTIONAL_CHECK_PATTERNS) ||
		adversary?.block_merge === true;
	if (hygiene && functional) return "mixed";
	if (hygiene) return "hygiene";
	return "functional";
}

export interface SynthesizeReviewOutcomeInput {
	runId: string;
	eval: EvalVerdictLike | null;
	adversary: AdversaryVerdictLike | null;
	benchmark?: BenchmarkLogLike | null;
	steerAttempt?: number;
	inlineRepairAttempted?: boolean;
}

export interface SynthesizedReviewOutcome {
	schema_version: string;
	run_id: string;
	status: "pass" | "fail" | "inconclusive";
	remediation_class: RemediationClass;
	recommended_next: string;
	source_artifacts: Record<string, string>;
	review_tier: string;
	eval_status?: string;
	adversary_status?: string;
	gap_kind?: GapKind;
	steer_attempt?: number;
}

/** Merge eval + adversary (+ benchmark) into a canonical review-outcome. */
export function synthesizeReviewOutcome(
	input: SynthesizeReviewOutcomeInput,
): SynthesizedReviewOutcome | null {
	const evalStatus = (input.eval?.status ?? "").toLowerCase();
	if (!evalStatus) return null;

	const adversaryPresent = input.adversary != null;
	const blockMerge = input.adversary?.block_merge === true;
	const evalRemediation = remediationClassFromEvalVerdict(input.eval);

	const sourceArtifacts: Record<string, string> = {};
	if (input.eval)
		sourceArtifacts["eval-verdict"] = "artifacts/eval-verdict.yaml";
	if (adversaryPresent) {
		sourceArtifacts["adversary-report"] = "artifacts/adversary-report.yaml";
	}

	let remediation: RemediationClass;
	let status: "pass" | "fail" | "inconclusive";
	let gapKind: GapKind | undefined;

	if (evalStatus === "pass" && blockMerge) {
		remediation = "implementation_gap";
		status = "fail";
		gapKind = classifyImplementationGap(
			input.eval,
			input.adversary,
			input.benchmark ?? null,
		);
	} else if (evalRemediation) {
		remediation = evalRemediation;
		status =
			evalStatus === "pass"
				? "pass"
				: evalStatus === "fail"
					? "fail"
					: "inconclusive";
		if (remediation === "implementation_gap") {
			gapKind = classifyImplementationGap(
				input.eval,
				input.adversary,
				input.benchmark ?? null,
			);
		}
	} else {
		remediation = "inconclusive";
		status = "inconclusive";
	}

	const burst = steerBurstAllowed(
		input.eval,
		input.adversary,
		input.inlineRepairAttempted,
	);

	const outcome: SynthesizedReviewOutcome = {
		schema_version: "1.0.0",
		run_id: input.runId,
		status,
		remediation_class: remediation,
		recommended_next: recommendedNextForRemediation(remediation, { burst }),
		source_artifacts: sourceArtifacts,
		review_tier: "synthesized",
		eval_status: input.eval?.status,
		adversary_status: blockMerge
			? "block_merge"
			: adversaryPresent
				? "proceed"
				: undefined,
	};
	if (gapKind) outcome.gap_kind = gapKind;
	if (input.steerAttempt != null) outcome.steer_attempt = input.steerAttempt;
	return outcome;
}

/** Extract shell-safe repro commands from adversary repro_steps or structured repro_commands. */
export function parseReproCommandsFromAdversary(
	adversary: AdversaryVerdictLike | null,
): { commands: string[]; skipped: string[] } {
	const commands: string[] = [];
	const skipped: string[] = [];

	if (Array.isArray(adversary?.repro_commands)) {
		for (const entry of adversary.repro_commands) {
			if (entry && typeof entry.cmd === "string" && entry.cmd.trim()) {
				commands.push(entry.cmd.trim());
			}
		}
	}

	if (Array.isArray(adversary?.repro_steps)) {
		for (const step of adversary.repro_steps) {
			if (typeof step !== "string") continue;
			const trimmed = step.trim();
			if (!trimmed) continue;
			for (const line of trimmed.split("\n")) {
				const cmd = line.trim();
				if (!cmd || cmd.startsWith("#")) continue;
				if (SHELL_CMD_PREFIX.test(cmd)) {
					if (!commands.includes(cmd)) commands.push(cmd);
				} else if (cmd.length > 0) {
					skipped.push(cmd.slice(0, 120));
				}
			}
		}
	}

	return { commands, skipped };
}
