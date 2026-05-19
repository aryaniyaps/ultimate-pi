import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	deriveHarnessStatusHint,
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
		...overrides,
	};
}

describe("nextHarnessPhase", () => {
	test("advances through the pipeline", () => {
		assert.equal(nextHarnessPhase("plan"), "execute");
		assert.equal(nextHarnessPhase("execute"), "evaluate");
		assert.equal(nextHarnessPhase("evaluate"), "adversary");
		assert.equal(nextHarnessPhase("adversary"), "merge");
	});

	test("merge has no next phase", () => {
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

	test("unapproved plan without command", () => {
		const hint = deriveHarnessStatusHint(baseState({ phase: "plan" }));
		assert.equal(hint.text, "Approve plan to continue");
		assert.equal(hint.severity, "warning");
	});
});
