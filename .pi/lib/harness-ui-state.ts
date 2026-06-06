import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { shouldEmitBlockingBudgetExhausted } from "./harness-budget-enforce.js";
import {
	extractCompletionStatuses,
	getLatestRunContext,
	nextStepAfterOutcome,
} from "./harness-run-context.js";
import { buildHarnessProgressStatusLine } from "./harness-subagent-progress.js";

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
	/** Set when active-run.json exists but this session has not run /harness-use-run yet. */
	crossSessionResumeCommand: string | null;
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
	crossSessionResumeCommand: null,
};

const RELEVANT_CUSTOM_TYPES = new Set([
	"harness-policy-state",
	"harness-debate-state",
	"harness-consensus-packet",
	"harness-round-result",
	"harness-budget-exhausted",
	"harness-budget-soft-limit",
	"harness-budget-telemetry",
	"harness-debate-budget-telemetry",
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

function applyPolicyState(
	state: HarnessUiState,
	latest: Map<string, unknown>,
): void {
	const policy = latest.get("harness-policy-state") as
		| PolicyStateLike
		| undefined;
	if (policy?.phase) state.phase = policy.phase;
	state.planApproved = Boolean(policy?.approvedPlan);
	state.planId = typeof policy?.planId === "string" ? policy.planId : null;
}

function applyReviewState(
	state: HarnessUiState,
	latest: Map<string, unknown>,
): void {
	const review = latest.get("harness-review-integrity") as
		| ReviewIntegrityStateLike
		| undefined;
	state.reviewViolationActive = Boolean(review?.violationActive);
	state.reviewIsolationOk = !state.reviewViolationActive;
}

function applyBudgetState(
	state: HarnessUiState,
	latest: Map<string, unknown>,
): void {
	const budget = latest.get("harness-budget-exhausted") as
		| BudgetExhaustedLike
		| undefined;
	if (budget && shouldEmitBlockingBudgetExhausted()) {
		state.budgetExhausted = true;
		state.budgetReason =
			typeof budget.exhaustion_reason === "string"
				? budget.exhaustion_reason
				: "unknown";
		const budgetUsed = asNumber(budget.budget_used);
		if (budgetUsed != null) state.debateBudgetUsed = budgetUsed;
		const cap = asNumber(budget.caps?.debate_global_cap);
		if (cap != null) state.debateBudgetCap = cap;
		return;
	}
	const telemetry = latest.get("harness-budget-telemetry") as
		| BudgetExhaustedLike
		| undefined;
	if (!telemetry) return;
	const budgetUsed = asNumber(telemetry.budget_used);
	if (budgetUsed != null) state.debateBudgetUsed = budgetUsed;
	const cap = asNumber(telemetry.caps?.debate_global_cap);
	if (cap != null) state.debateBudgetCap = cap;
}

function applyTestIntegrityState(
	state: HarnessUiState,
	latest: Map<string, unknown>,
): void {
	const testIntegrity = latest.get("harness-test-integrity-flag") as
		| TestIntegrityLike
		| undefined;
	if (
		testIntegrity?.severity !== "high" &&
		testIntegrity?.severity !== "medium"
	) {
		return;
	}
	state.testIntegritySeverity = testIntegrity.severity;
	state.testIntegrityReasons = Array.isArray(testIntegrity.reasons)
		? testIntegrity.reasons.filter((r): r is string => typeof r === "string")
		: [];
}

function applyDebateState(
	state: HarnessUiState,
	latest: Map<string, unknown>,
): void {
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
}

function applyRoundAndConsensusState(
	state: HarnessUiState,
	latest: Map<string, unknown>,
): void {
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
	if (correctness != null) state.severity.correctness = correctness;
	const security = asNumber(consensus?.severity_scores?.security);
	if (security != null) state.severity.security = security;
	const architecture = asNumber(consensus?.severity_scores?.architecture);
	if (architecture != null) state.severity.architecture = architecture;
	const test = asNumber(consensus?.severity_scores?.test_integrity);
	if (test != null) state.severity.testIntegrity = test;
}

function applyTraceState(
	state: HarnessUiState,
	latest: Map<string, unknown>,
): void {
	const runTrace = latest.get("harness-run-trace") as TraceLike | undefined;
	const traceState = latest.get("harness-trace-state") as TraceLike | undefined;
	state.traceRunId =
		typeof runTrace?.run_id === "string"
			? runTrace.run_id
			: typeof traceState?.run_id === "string"
				? traceState.run_id
				: null;
}

function applyRunContextState(
	state: HarnessUiState,
	latest: Map<string, unknown>,
	entries: unknown[],
): void {
	const runCtx = latest.get("harness-run-context") as
		| {
				phase?: HarnessPhase;
				plan_ready?: boolean;
				plan_id?: string | null;
				run_id?: string;
				next_recommended_command?: string | null;
				last_completed_step?: string | null;
				last_outcome?: string | null;
				status?: string;
		  }
		| undefined;
	if (!runCtx) {
		state.nextRecommendedCommand = null;
		return;
	}
	if (runCtx.plan_ready) {
		state.planApproved = true;
		if (typeof runCtx.plan_id === "string") state.planId = runCtx.plan_id;
	}
	if (runCtx.phase) state.phase = runCtx.phase;
	if (typeof runCtx.run_id === "string") state.traceRunId = runCtx.run_id;

	const persisted = runCtx.next_recommended_command;
	if (typeof persisted === "string" && persisted.startsWith("/")) {
		state.nextRecommendedCommand = persisted;
		return;
	}
	const statuses = extractCompletionStatuses(entries);
	state.nextRecommendedCommand = nextStepAfterOutcome({
		phase: state.phase,
		planStatus: runCtx.plan_ready ? "ready" : null,
		lastCompletedStep: runCtx.last_completed_step,
		lastOutcome: runCtx.last_outcome,
		executionStatus: statuses.executionStatus,
		evalStatus: statuses.evalStatus,
		aborted: runCtx.status === "aborted",
	});
}

export function createStateFromEntries(entries: unknown[]): HarnessUiState {
	const latest = pickLatestCustomEntries(entries);
	const state: HarnessUiState = {
		...DEFAULT_STATE,
		severity: { ...DEFAULT_STATE.severity },
	};

	applyPolicyState(state, latest);
	applyReviewState(state, latest);
	applyBudgetState(state, latest);
	applyTestIntegrityState(state, latest);
	applyDebateState(state, latest);
	applyRoundAndConsensusState(state, latest);
	applyTraceState(state, latest);
	applyRunContextState(state, latest, entries);
	state.flowSubstate = deriveFlowSubstate(state);
	return state;
}

/** Fingerprint for widget refresh — not just session entry count. */
export function harnessUiEntriesFingerprint(entries: unknown[]): string {
	const latest = pickLatestCustomEntries(entries);
	return JSON.stringify({
		len: entries.length,
		policy: latest.get("harness-policy-state") ?? null,
		run: latest.get("harness-run-context") ?? null,
	});
}

export type HarnessStatusSeverity =
	| "accent"
	| "warning"
	| "error"
	| "success"
	| "muted";

export const HARNESS_PHASE_ORDER: readonly HarnessPhase[] = [
	"plan",
	"execute",
	"evaluate",
] as const;

export function formatHarnessPhaseLabel(phase: HarnessPhase): string {
	switch (phase) {
		case "plan":
			return "plan";
		case "execute":
			return "run";
		case "evaluate":
		case "adversary":
		case "merge":
			return "review";
	}
}

export function nextHarnessPhase(phase: HarnessPhase): HarnessPhase | null {
	const index = HARNESS_PHASE_ORDER.indexOf(phase);
	if (index < 0 || index >= HARNESS_PHASE_ORDER.length - 1) return null;
	return HARNESS_PHASE_ORDER[index + 1] ?? null;
}

function mainPhaseCommandForStatus(state: HarnessUiState): string | null {
	const command = state.nextRecommendedCommand;
	if (!command) return null;
	const normalized = command.toLowerCase();

	if (normalized.includes("/harness-plan")) {
		return normalized.includes("revise")
			? "/harness-plan (mode: revise)"
			: "/harness-plan";
	}
	if (normalized.includes("/harness-review")) return "/harness-review";
	if (normalized.includes("/harness-run-status")) {
		return state.phase === "execute" ? "/harness-review" : null;
	}
	if (normalized.includes("/harness-run")) return "/harness-run";
	if (normalized.includes("/harness-steer")) return "/harness-run";
	return null;
}

function truncateStatusCommand(command: string, maxLen = 40): string {
	if (command.length <= maxLen) return command;
	return `${command.slice(0, maxLen - 3)}...`;
}

export function deriveHarnessStatusHint(state: HarnessUiState): {
	text: string;
	severity: HarnessStatusSeverity;
} {
	if (state.crossSessionResumeCommand) {
		return {
			text: `Resume: ${truncateStatusCommand(state.crossSessionResumeCommand)}`,
			severity: "warning",
		};
	}
	if (state.budgetExhausted) {
		return { text: "Budget limit reached", severity: "error" };
	}
	if (state.testIntegritySeverity === "high") {
		return { text: "Test integrity issue", severity: "error" };
	}
	if (state.policyDecision === "block") {
		return { text: "Blocked — fix issues first", severity: "error" };
	}
	const progressLine = buildHarnessProgressStatusLine();
	if (progressLine) {
		return { text: progressLine, severity: "accent" };
	}
	if (
		state.policyDecision === "human_required" ||
		state.flowSubstate === "human-required"
	) {
		return { text: "Waiting for your input", severity: "warning" };
	}
	const mainPhaseCommand = mainPhaseCommandForStatus(state);
	if (mainPhaseCommand) {
		return {
			text: `Next: ${truncateStatusCommand(mainPhaseCommand)}`,
			severity: "accent",
		};
	}
	if (state.phase === "plan") {
		if (!state.planApproved) {
			return { text: "Approve plan to continue", severity: "warning" };
		}
		return { text: "Plan approved", severity: "success" };
	}
	if (state.policyDecision === "pass") {
		return { text: "Checks passed", severity: "success" };
	}
	if (state.policyDecision === "conditional_pass") {
		return { text: "Passed with notes", severity: "warning" };
	}
	switch (state.phase) {
		case "execute":
			return { text: "Running changes", severity: "accent" };
		case "evaluate":
		case "adversary":
			return { text: "Reviewing changes", severity: "accent" };
		case "merge":
			return { text: "Review complete", severity: "accent" };
		default:
			return { text: "Planning", severity: "muted" };
	}
}

export class HarnessUiStateStore {
	private lastFingerprint = "";
	private crossSessionResumeCommand: string | null = null;
	private cachedState: HarnessUiState = {
		...DEFAULT_STATE,
		severity: { ...DEFAULT_STATE.severity },
	};

	public setCrossSessionResumeCommand(command: string | null): void {
		this.crossSessionResumeCommand = command;
	}

	private applyCrossSessionOverlay(state: HarnessUiState): HarnessUiState {
		if (!this.crossSessionResumeCommand) {
			return { ...state, crossSessionResumeCommand: null };
		}
		return {
			...state,
			crossSessionResumeCommand: this.crossSessionResumeCommand,
		};
	}

	/** Refresh from session entries; recompute when harness policy/run context changes. */
	public refresh(ctx: ExtensionContext): HarnessUiState {
		const entries = ctx.sessionManager.getEntries();
		const fingerprint = harnessUiEntriesFingerprint(entries);
		if (fingerprint !== this.lastFingerprint) {
			this.cachedState = createStateFromEntries(entries);
			this.lastFingerprint = fingerprint;
			if (getLatestRunContext(entries)) {
				this.crossSessionResumeCommand = null;
			}
		}
		this.cachedState = this.applyCrossSessionOverlay(this.cachedState);
		return this.cachedState;
	}

	public snapshot(): HarnessUiState {
		return this.cachedState;
	}
}
