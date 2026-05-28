import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldArchiveForPlanRevise } from "../.pi/extensions/harness-run-context.ts";

const runCtx = {
	next_recommended_command: "Continue /harness-plan: finish Review Gate",
};

test("shouldArchiveForPlanRevise does not archive on ordinary harness-plan continue", () => {
	assert.equal(
		shouldArchiveForPlanRevise({
			command: "harness-plan",
			mode: "revise",
			runCtx,
			reviewOutcome: { remediation_class: "plan_gap" },
			userPrompt:
				"Continue /harness-plan run 019e69f3. CRITICAL: do NOT trigger plan revision archive.",
		}),
		false,
	);
});

test("shouldArchiveForPlanRevise archives on explicit --mode revise", () => {
	assert.equal(
		shouldArchiveForPlanRevise({
			command: "harness-plan",
			mode: "revise",
			runCtx,
			reviewOutcome: null,
			userPrompt: '/harness-plan --mode revise "fix plan gaps"',
		}),
		true,
	);
});

test("shouldArchiveForPlanRevise archives on plan_gap remediation when prompt names it", () => {
	assert.equal(
		shouldArchiveForPlanRevise({
			command: "harness-plan",
			mode: "revise",
			runCtx,
			reviewOutcome: { remediation_class: "plan_gap" },
			userPrompt: "Continue /harness-plan to address plan_gap from review",
		}),
		true,
	);
});
