import { test } from "node:test";
import assert from "node:assert/strict";
import {
	HARNESS_MAX_ACTIVE_SUBAGENTS,
	HARNESS_MAX_SUBAGENT_SPAWNS_PER_SESSION,
	isHarnessAgentType,
} from "../.pi/extensions/lib/harness-spawn-budget.ts";

test("isHarnessAgentType matches harness paths", () => {
	assert.equal(isHarnessAgentType("harness/executor"), true);
	assert.equal(isHarnessAgentType("harness/planning/scout-graphify"), true);
	assert.equal(isHarnessAgentType("general-purpose"), false);
});

test("spawn budget constants are ordered sensibly", () => {
	assert.ok(HARNESS_MAX_SUBAGENT_SPAWNS_PER_SESSION >= HARNESS_MAX_ACTIVE_SUBAGENTS);
	assert.equal(HARNESS_MAX_ACTIVE_SUBAGENTS, 8);
	assert.equal(HARNESS_MAX_SUBAGENT_SPAWNS_PER_SESSION, 12);
});
