import { test } from "node:test";
import assert from "node:assert/strict";
import {
	checkHarnessSpawnBudget,
	createSpawnBudgetState,
	isHarnessAgentType,
	recordSpawnEnd,
	recordSpawnStart,
} from "../.pi/extensions/lib/harness-spawn-budget.ts";

test("isHarnessAgentType matches harness paths", () => {
	assert.equal(isHarnessAgentType("harness/executor"), true);
	assert.equal(isHarnessAgentType("harness/planning/scout-graphify"), true);
	assert.equal(isHarnessAgentType("general-purpose"), false);
});

test("checkHarnessSpawnBudget never blocks spawns", () => {
	const state = createSpawnBudgetState();
	for (let i = 0; i < 50; i++) {
		recordSpawnStart(state, 3);
	}
	const result = checkHarnessSpawnBudget(state, 20);
	assert.equal(result.ok, true);
	assert.equal(result.message, undefined);
	recordSpawnEnd(state, 20);
});
