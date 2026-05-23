import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	formatCrossSessionResumeMessage,
	nextStepAfterOutcome,
} from "../.pi/lib/harness-run-context.ts";
import {
	createStateFromEntries,
	deriveHarnessStatusHint,
	formatHarnessPhaseLabel,
	type HarnessUiState,
	nextHarnessPhase,
} from "../.pi/lib/harness-ui-state.ts";

function baseState(overrides: Partial<HarnessUiState> = {}): HarnessUiState {
	return {
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
		...overrides,
	};
}

describe("nextHarnessPhase", () => {
	test("advances through the user-facing plan/run/review pipeline", () => {
		assert.equal(formatHarnessPhaseLabel("plan"), "plan");
		assert.equal(formatHarnessPhaseLabel("execute"), "run");
		assert.equal(formatHarnessPhaseLabel("evaluate"), "review");
		assert.equal(formatHarnessPhaseLabel("adversary"), "review");
		assert.equal(formatHarnessPhaseLabel("merge"), "review");
		assert.equal(nextHarnessPhase("plan"), "execute");
		assert.equal(nextHarnessPhase("execute"), "evaluate");
	});

	test("review-side internal phases have no next widget phase", () => {
		assert.equal(nextHarnessPhase("evaluate"), null);
		assert.equal(nextHarnessPhase("adversary"), null);
		assert.equal(nextHarnessPhase("merge"), null);
	});
});

describe("deriveHarnessStatusHint", () => {
	test("blocker beats next command", () => {
		const hint = deriveHarnessStatusHint(
			baseState({
				budgetExhausted: true,
				nextRecommendedCommand: "/harness-eval",
			}),
		);
		assert.equal(hint.text, "Budget limit reached");
		assert.equal(hint.severity, "error");
	});

	test("next command beats plan-approved default", () => {
		const hint = deriveHarnessStatusHint(
			baseState({
				phase: "plan",
				planApproved: true,
				nextRecommendedCommand: "/harness-run",
			}),
		);
		assert.equal(hint.text, "Next: /harness-run");
		assert.equal(hint.severity, "accent");
	});

	test("run-status auxiliary command displays review as next main phase", () => {
		const hint = deriveHarnessStatusHint(
			baseState({
				phase: "execute",
				nextRecommendedCommand: "/harness-run-status",
			}),
		);
		assert.equal(hint.text, "Next: /harness-review");
		assert.equal(hint.severity, "accent");
	});

	test("implementation repair auxiliary command displays run as main phase", () => {
		const hint = deriveHarnessStatusHint(
			baseState({
				phase: "evaluate",
				nextRecommendedCommand: "/harness-steer",
			}),
		);
		assert.equal(hint.text, "Next: /harness-run");
		assert.equal(hint.severity, "accent");
	});

	test("plan revise recommendation keeps the main plan command", () => {
		const hint = deriveHarnessStatusHint(
			baseState({
				phase: "evaluate",
				nextRecommendedCommand: "/harness-plan or /harness-incident",
			}),
		);
		assert.equal(hint.text, "Next: /harness-plan");
		assert.equal(hint.severity, "accent");
	});

	test("unapproved plan without command", () => {
		const hint = deriveHarnessStatusHint(baseState({ phase: "plan" }));
		assert.equal(hint.text, "Approve plan to continue");
		assert.equal(hint.severity, "warning");
	});
});

describe("nextStepAfterOutcome", () => {
	test("after execute completes in evaluate phase suggests harness-review", () => {
		assert.equal(
			nextStepAfterOutcome({
				phase: "evaluate",
				lastCompletedStep: "execute",
				lastOutcome: "ready",
				executionStatus: "completed",
			}),
			"/harness-review",
		);
	});

	test("execute phase with completed status suggests harness-review", () => {
		assert.equal(
			nextStepAfterOutcome({
				phase: "execute",
				executionStatus: "completed",
			}),
			"/harness-review",
		);
	});

	test("eval fail after review with implementation_gap suggests steer", () => {
		assert.equal(
			nextStepAfterOutcome({
				phase: "evaluate",
				evalStatus: "fail",
				lastCompletedStep: "review",
				remediationClass: "implementation_gap",
				steerAttempt: 0,
				steerMaxAttempts: 3,
				reviewComplete: true,
			}),
			"/harness-steer",
		);
	});

	test("blocked execute suggests harness-review before replan", () => {
		assert.equal(
			nextStepAfterOutcome({
				phase: "execute",
				executionStatus: "blocked",
			}),
			"/harness-review",
		);
	});
});

describe("createStateFromEntries run-context merge", () => {
	test("harness-use-run disk context overrides stale policy", () => {
		const state = createStateFromEntries([
			{
				type: "custom",
				customType: "harness-policy-state",
				data: { phase: "plan", approvedPlan: false, planId: null },
			},
			{
				type: "custom",
				customType: "harness-run-context",
				data: {
					phase: "plan",
					plan_ready: true,
					plan_id: "plan-recovery",
					run_id: "run-recovery",
					last_completed_step: "plan",
					last_outcome: "ready",
					next_recommended_command: null,
					status: "active",
				},
			},
		]);
		assert.equal(state.phase, "plan");
		assert.equal(state.planApproved, true);
		assert.equal(state.planId, "plan-recovery");
		assert.equal(state.traceRunId, "run-recovery");
		const hint = deriveHarnessStatusHint(state);
		assert.equal(hint.text, "Next: /harness-run");
	});

	test("recomputes next as harness-review after execute when no persisted command", () => {
		const state = createStateFromEntries([
			{
				type: "custom",
				customType: "harness-policy-state",
				data: { phase: "evaluate", approvedPlan: true, planId: "plan-x" },
			},
			{
				type: "custom",
				customType: "harness-run-context",
				data: {
					phase: "evaluate",
					plan_ready: true,
					plan_id: "plan-x",
					run_id: "run-x",
					last_completed_step: "execute",
					last_outcome: "completed",
					next_recommended_command: null,
					status: "active",
				},
			},
		]);
		assert.equal(state.nextRecommendedCommand, "/harness-review");
		const hint = deriveHarnessStatusHint(state);
		assert.equal(hint.text, "Next: /harness-review");
	});

	test("prefers persisted next_recommended_command from run context", () => {
		const state = createStateFromEntries([
			{
				type: "custom",
				customType: "harness-policy-state",
				data: { phase: "evaluate", approvedPlan: true, planId: "plan-x" },
			},
			{
				type: "custom",
				customType: "harness-run-context",
				data: {
					phase: "evaluate",
					plan_ready: true,
					plan_id: "plan-x",
					run_id: "run-x",
					last_completed_step: "review",
					last_outcome: "fail",
					next_recommended_command: "/harness-plan or /harness-incident",
					status: "active",
				},
			},
		]);
		assert.equal(
			state.nextRecommendedCommand,
			"/harness-plan or /harness-incident",
		);
	});
});

describe("cross-session resume UX", () => {
	test("formatCrossSessionResumeMessage includes harness-use-run", () => {
		const text = formatCrossSessionResumeMessage({
			runId: "run-abc",
			resumeCommand: "/harness-use-run run-abc --claim",
			phase: "evaluate",
			planReady: true,
			nextAfterResume: "/harness-review",
			taskSummary: "Update graphify KB",
		});
		assert.match(text, /run-abc/);
		assert.match(text, /\/harness-use-run run-abc --claim/);
		assert.match(text, /\/harness-review/);
	});

	test("cross-session resume hint beats next command", () => {
		const hint = deriveHarnessStatusHint(
			baseState({
				nextRecommendedCommand: "/harness-run-status",
				crossSessionResumeCommand: "/harness-use-run run-abc",
			}),
		);
		assert.equal(hint.text, "Resume: /harness-use-run run-abc");
		assert.equal(hint.severity, "warning");
	});
});
