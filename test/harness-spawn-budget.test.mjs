import { test } from "node:test";
import assert from "node:assert/strict";
import {
	checkHarnessSpawnBudget,
	createSpawnBudgetState,
	isHarnessAgentType,
	recordSpawnEnd,
	recordSpawnStart,
} from "../.pi/lib/harness-spawn-budget.ts";

test("isHarnessAgentType matches harness paths", () => {
	assert.equal(isHarnessAgentType("harness/running/executor"), true);
	assert.equal(isHarnessAgentType("harness/planning/planning-context"), true);
	assert.equal(isHarnessAgentType("general-purpose"), false);
});

test("checkHarnessSpawnBudget never blocks when enforce off", () => {
	const prev = process.env.HARNESS_BUDGET_ENFORCE;
	delete process.env.HARNESS_BUDGET_ENFORCE;
	try {
		const state = createSpawnBudgetState();
		for (let i = 0; i < 50; i++) {
			recordSpawnStart(state, 3);
		}
		const result = checkHarnessSpawnBudget(state, 20, "plan");
		assert.equal(result.ok, true);
		assert.equal(result.message, undefined);
	} finally {
		if (prev !== undefined) process.env.HARNESS_BUDGET_ENFORCE = prev;
	}
});

test("checkHarnessSpawnBudget blocks plan phase when enforce on", () => {
	const prev = process.env.HARNESS_BUDGET_ENFORCE;
	process.env.HARNESS_BUDGET_ENFORCE = "1";
	try {
		const state = createSpawnBudgetState();
		recordSpawnStart(state, 10);
		const result = checkHarnessSpawnBudget(state, 3, "plan");
		assert.equal(result.ok, false);
		assert.match(result.message ?? "", /plan phase/);
	} finally {
		if (prev === undefined) delete process.env.HARNESS_BUDGET_ENFORCE;
		else process.env.HARNESS_BUDGET_ENFORCE = prev;
	}
});
