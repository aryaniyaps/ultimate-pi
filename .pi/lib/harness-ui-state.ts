import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

export type HarnessPhase =
	| "plan"
	| "execute"
	| "evaluate"
	| "adversary"
	| "merge";
export type HarnessPolicyDecision =
	| "pass"
	| "conditional_pass"
	| "block"
	| "human_required"
	| null;
export type HarnessFlowSubstate =
	| "idle"
	| "severity-policy"
	| "commit-pr"
	| "blocked"
	| "human-required";

interface CustomEntryLike {
	type?: string;
	customType?: string;
	data?: unknown;
}

type DebateStateLike = {
	round_count?: number;
	budget_used?: number;
	max_rounds?: number;
	debate_global_cap?: number;
};

type PolicyStateLike = {
	phase?: HarnessPhase;
	approvedPlan?: boolean;
	planId?: string | null;
};

type ReviewIntegrityStateLike = {
	violationActive?: boolean;
	executorSessionId?: string | null;
};

type ConsensusLike = {
	policy_decision?: HarnessPolicyDecision;
	severity_scores?: {
		correctness?: number;
		security?: number;
		architecture?: number;
		test_integrity?: number;
	};
};

type BudgetExhaustedLike = {
	exhaustion_reason?: string;
	budget_used?: number;
	caps?: { debate_global_cap?: number };
};

type TestIntegrityLike = {
	severity?: "medium" | "high";
	reasons?: string[];
};

type TraceLike = {
	run_id?: string;
};

type RoundLike = {
	round_index?: number;
	consensus_delta?: number;
};

export interface HarnessUiState {
	phase: HarnessPhase;
	flowSubstate: HarnessFlowSubstate;
	planApproved: boolean;
	planId: string | null;
	reviewIsolationOk: boolean;
	reviewViolationActive: boolean;
	budgetExhausted: boolean;
	budgetReason: string | null;
	testIntegritySeverity: "none" | "medium" | "high";
	testIntegrityReasons: string[];
	debateRound: number;
	debateMaxRounds: number | null;
	debateBudgetUsed: number | null;
	debateBudgetCap: number | null;
	policyDecision: HarnessPolicyDecision;
	consensusDelta: number | null;
	severity: {
		correctness: number | null;
		security: number | null;
		architecture: number | null;
		testIntegrity: number | null;
	};
	traceRunId: string | null;
	nextRecommendedCommand: string | null;
}

const DEFAULT_STATE: HarnessUiState = {
	phase: "plan",
	flowSubstate: "idle",
	planApproved: false,
	planId: null,
	reviewIsolationOk: true,
	reviewViolationActive: false,
	budgetExhausted: false,
	budgetReason: null,
	testIntegritySeverity: "none",
	testIntegrityReasons: [],
	debateRound: 0,
	debateMaxRounds: null,
	debateBudgetUsed: null,
	debateBudgetCap: null,
	policyDecision: null,
	consensusDelta: null,
	severity: {
		correctness: null,
		security: null,
		architecture: null,
		testIntegrity: null,
	},
	traceRunId: null,
	nextRecommendedCommand: null,
};

const RELEVANT_CUSTOM_TYPES = new Set([
	"harness-policy-state",
	"harness-debate-state",
	"harness-consensus-packet",
	"harness-round-result",
	"harness-budget-exhausted",
	"harness-review-integrity",
	"harness-test-integrity-flag",
	"harness-run-trace",
	"harness-trace-state",
	"harness-run-context",
]);

function asNumber(value: unknown): number | null {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return null;
	return parsed;
}

function pickLatestCustomEntries(entries: unknown[]): Map<string, unknown> {
	const latest = new Map<string, unknown>();
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i] as CustomEntryLike;
		if (entry.type !== "custom") continue;
		if (!entry.customType || !RELEVANT_CUSTOM_TYPES.has(entry.customType))
			continue;
		if (!latest.has(entry.customType)) {
			latest.set(entry.customType, entry.data);
		}
		if (latest.size === RELEVANT_CUSTOM_TYPES.size) break;
	}
	return latest;
}

function deriveFlowSubstate(state: HarnessUiState): HarnessFlowSubstate {
	if (state.budgetExhausted || state.testIntegritySeverity === "high") {
		return "blocked";
	}
	if (state.policyDecision === "human_required") {
		return "human-required";
	}
	if (state.phase !== "merge") {
		return "idle";
	}
	if (
		state.policyDecision === "pass" ||
		state.policyDecision === "conditional_pass"
	) {
		return "commit-pr";
	}
	if (
		state.policyDecision === "block" ||
		state.policyDecision === "human_required"
	) {
		return "severity-policy";
	}
	if (state.debateRound > 0) {
		return "severity-policy";
	}
	return "idle";
}

function createStateFromEntries(entries: unknown[]): HarnessUiState {
	const latest = pickLatestCustomEntries(entries);
	const state: HarnessUiState = {
		...DEFAULT_STATE,
		severity: { ...DEFAULT_STATE.severity },
	};

	const policy = latest.get("harness-policy-state") as
		| PolicyStateLike
		| undefined;
	if (policy?.phase) state.phase = policy.phase;
	state.planApproved = Boolean(policy?.approvedPlan);
	state.planId = typeof policy?.planId === "string" ? policy.planId : null;

	const review = latest.get("harness-review-integrity") as
		| ReviewIntegrityStateLike
		| undefined;
	state.reviewViolationActive = Boolean(review?.violationActive);
	state.reviewIsolationOk = !state.reviewViolationActive;

	const budget = latest.get("harness-budget-exhausted") as
		| BudgetExhaustedLike
		| undefined;
	if (budget) {
		state.budgetExhausted = true;
		state.budgetReason =
			typeof budget.exhaustion_reason === "string"
				? budget.exhaustion_reason
				: "unknown";
		const budgetUsed = asNumber(budget.budget_used);
		if (budgetUsed != null) state.debateBudgetUsed = budgetUsed;
		const cap = asNumber(budget.caps?.debate_global_cap);
		if (cap != null) state.debateBudgetCap = cap;
	}

	const testIntegrity = latest.get("harness-test-integrity-flag") as
		| TestIntegrityLike
		| undefined;
	if (
		testIntegrity?.severity === "high" ||
		testIntegrity?.severity === "medium"
	) {
		state.testIntegritySeverity = testIntegrity.severity;
		state.testIntegrityReasons = Array.isArray(testIntegrity.reasons)
			? testIntegrity.reasons.filter((r): r is string => typeof r === "string")
			: [];
	}

	const debate = latest.get("harness-debate-state") as
		| DebateStateLike
		| undefined;
	const round = asNumber(debate?.round_count);
	if (round != null) state.debateRound = round;
	const maxRounds = asNumber(debate?.max_rounds);
	if (maxRounds != null) state.debateMaxRounds = maxRounds;
	const debateBudgetUsed = asNumber(debate?.budget_used);
	if (debateBudgetUsed != null) state.debateBudgetUsed = debateBudgetUsed;
	const debateBudgetCap = asNumber(debate?.debate_global_cap);
	if (debateBudgetCap != null) state.debateBudgetCap = debateBudgetCap;

	const roundResult = latest.get("harness-round-result") as
		| RoundLike
		| undefined;
	const roundIndex = asNumber(roundResult?.round_index);
	if (roundIndex != null)
		state.debateRound = Math.max(state.debateRound, roundIndex);
	const consensusDelta = asNumber(roundResult?.consensus_delta);
	if (consensusDelta != null) state.consensusDelta = consensusDelta;

	const consensus = latest.get("harness-consensus-packet") as
		| ConsensusLike
		| undefined;
	if (
		consensus?.policy_decision === "pass" ||
		consensus?.policy_decision === "conditional_pass" ||
		consensus?.policy_decision === "block" ||
		consensus?.policy_decision === "human_required"
	) {
		state.policyDecision = consensus.policy_decision;
	}
	const correctness = asNumber(consensus?.severity_scores?.correctness);
	const security = asNumber(consensus?.severity_scores?.security);
	const architecture = asNumber(consensus?.severity_scores?.architecture);
	const test = asNumber(consensus?.severity_scores?.test_integrity);
	if (correctness != null) state.severity.correctness = correctness;
	if (security != null) state.severity.security = security;
	if (architecture != null) state.severity.architecture = architecture;
	if (test != null) state.severity.testIntegrity = test;

	const runTrace = latest.get("harness-run-trace") as TraceLike | undefined;
	const traceState = latest.get("harness-trace-state") as TraceLike | undefined;
	state.traceRunId =
		typeof runTrace?.run_id === "string"
			? runTrace.run_id
			: typeof traceState?.run_id === "string"
				? traceState.run_id
				: null;

	const runCtx = latest.get("harness-run-context") as
		| { next_recommended_command?: string }
		| undefined;
	state.nextRecommendedCommand =
		typeof runCtx?.next_recommended_command === "string"
			? runCtx.next_recommended_command
			: null;

	state.flowSubstate = deriveFlowSubstate(state);
	return state;
}

export class HarnessUiStateStore {
	private lastEntriesLen = -1;
	private cachedState: HarnessUiState = {
		...DEFAULT_STATE,
		severity: { ...DEFAULT_STATE.severity },
	};

	/** Refresh from session entries with a lightweight length-based memoization. */
	public refresh(ctx: ExtensionContext): HarnessUiState {
		const entries = ctx.sessionManager.getEntries();
		if (entries.length !== this.lastEntriesLen) {
			this.cachedState = createStateFromEntries(entries);
			this.lastEntriesLen = entries.length;
		}
		return this.cachedState;
	}

	public snapshot(): HarnessUiState {
		return this.cachedState;
	}
}
