import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	isHarnessBudgetEnforceOn,
	shouldEmitBlockingBudgetExhausted,
} from "../.pi/lib/harness-budget-enforce.ts";
import { createStateFromEntries } from "../.pi/lib/harness-ui-state.ts";

describe("harness-budget-enforce", () => {
	test("enforce off by default", () => {
		const prev = process.env.HARNESS_BUDGET_ENFORCE;
		delete process.env.HARNESS_BUDGET_ENFORCE;
		assert.equal(isHarnessBudgetEnforceOn(), false);
		assert.equal(shouldEmitBlockingBudgetExhausted(), false);
		if (prev !== undefined) process.env.HARNESS_BUDGET_ENFORCE = prev;
	});

	test("soft budget telemetry does not block UI when enforce off", () => {
		const prev = process.env.HARNESS_BUDGET_ENFORCE;
		delete process.env.HARNESS_BUDGET_ENFORCE;
		const state = createStateFromEntries([
			{
				type: "custom",
				customType: "harness-budget-soft-limit",
				data: { phase: "plan" },
			},
			{
				type: "custom",
				customType: "harness-budget-telemetry",
				data: {
					exhaustion_reason: "phase_cap_exceeded",
					budget_used: 90000,
				},
			},
		]);
		assert.equal(state.budgetExhausted, false);
		assert.equal(state.flowSubstate, "idle");
		if (prev !== undefined) process.env.HARNESS_BUDGET_ENFORCE = prev;
	});
});
