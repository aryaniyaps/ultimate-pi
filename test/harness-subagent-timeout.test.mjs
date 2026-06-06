import { test } from "node:test";
import assert from "node:assert/strict";
import {
	isHarnessSubagentTimeoutDisabled,
	resolveHarnessSubagentTimeoutForAgents,
	resolveHarnessSubagentTimeoutMs,
} from "../.pi/lib/harness-subagent-timeout.ts";

test("resolveHarnessSubagentTimeoutMs returns phase defaults", () => {
	assert.equal(resolveHarnessSubagentTimeoutMs("plan"), 1_800_000);
	assert.equal(resolveHarnessSubagentTimeoutMs("execute"), 2_700_000);
	assert.equal(resolveHarnessSubagentTimeoutMs("evaluate"), 1_200_000);
});

test("HARNESS_SUBAGENT_TIMEOUT_DISABLE returns undefined", () => {
	const prev = process.env.HARNESS_SUBAGENT_TIMEOUT_DISABLE;
	process.env.HARNESS_SUBAGENT_TIMEOUT_DISABLE = "1";
	assert.equal(isHarnessSubagentTimeoutDisabled(), true);
	assert.equal(resolveHarnessSubagentTimeoutMs("plan"), undefined);
	process.env.HARNESS_SUBAGENT_TIMEOUT_DISABLE = prev;
});

test("resolveHarnessSubagentTimeoutForAgents picks strictest cap", () => {
	const cap = resolveHarnessSubagentTimeoutForAgents("evaluate", [
		"harness/reviewing/evaluator",
		"harness/planning/decompose",
	]);
	assert.equal(cap, 1_200_000);
});
