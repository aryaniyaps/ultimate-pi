import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateHarnessSubagentToolCall } from "../.pi/extensions/lib/harness-subagents/harness-subagent-policy.ts";
import { evaluateSubagentToolCall } from "../.pi/extensions/lib/harness-subagents/spawn-policy.ts";
import {
	extractJsonBlock,
	parseHarnessAgentJson,
} from "../.pi/lib/harness-agent-output.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("evaluator blocks write and mutating bash", () => {
	const write = evaluateHarnessSubagentToolCall(
		"write",
		{ path: "src/a.ts", content: "x" },
		"harness/evaluator",
	);
	assert.equal(write.action, "block");

	const bash = evaluateHarnessSubagentToolCall(
		"bash",
		{ command: "git commit -m test" },
		"harness/evaluator",
	);
	assert.equal(bash.action, "block");

	const read = evaluateHarnessSubagentToolCall(
		"read",
		{ path: "src/a.ts" },
		"harness/evaluator",
	);
	assert.equal(read.action, "allow");
});

test("executor allows write", () => {
	const write = evaluateHarnessSubagentToolCall(
		"write",
		{ path: "src/a.ts", content: "x" },
		"harness/executor",
	);
	assert.equal(write.action, "allow");
});

test("planner blocks write", () => {
	const write = evaluateHarnessSubagentToolCall(
		"write",
		{ path: "plan.json", content: "{}" },
		"harness/planner",
	);
	assert.equal(write.action, "block");
});

test("parseHarnessAgentJson extracts fenced block", () => {
	const text = `Summary here.\n\`\`\`json\n{"status":"ready","plan_packet":{"plan_id":"p1"}}\n\`\`\``;
	const parsed = parseHarnessAgentJson(text);
	assert.equal(parsed.ok, true);
	assert.equal(parsed.value.status, "ready");
});

test("harness-plan prompt references harness/planner", () => {
	const planPrompt = readFileSync(
		join(root, ".pi/prompts/harness-plan.md"),
		"utf-8",
	);
	assert.match(planPrompt, /harness\/planner/);
	assert.match(planPrompt, /HarnessSpawnContext/);
	assert.doesNotMatch(planPrompt, /harness-spawn-context\.schema\.json/);
});

test("planner allows ask_user via spawn policy", () => {
	const ask = evaluateSubagentToolCall("ask_user", "harness/planner");
	assert.equal(ask.action, "allow");
	const execAsk = evaluateSubagentToolCall("ask_user", "harness/executor");
	assert.equal(execAsk.action, "block");
});

test("planner allows approve_plan and create_plan via spawn policy", () => {
	const approve = evaluateSubagentToolCall("approve_plan", "harness/planner");
	assert.equal(approve.action, "allow");
	const create = evaluateSubagentToolCall("create_plan", "harness/planner");
	assert.equal(create.action, "allow");
	const execCreate = evaluateSubagentToolCall(
		"create_plan",
		"harness/executor",
	);
	assert.equal(execCreate.action, "block");
});

test("planner blocks write and edit via harness-subagent-policy", () => {
	const write = evaluateHarnessSubagentToolCall("write", {}, "harness/planner");
	assert.equal(write.action, "block");
	const create = evaluateHarnessSubagentToolCall(
		"create_plan",
		{},
		"harness/planner",
	);
	assert.equal(create.action, "allow");
});

test("planner agent includes ask_user tool", () => {
	const planner = readFileSync(
		join(root, ".pi/agents/harness/planner.md"),
		"utf-8",
	);
	assert.match(planner, /\bask_user\b/);
	assert.match(planner, /\bapprove_plan\b/);
	assert.match(planner, /\bcreate_plan\b/);
	assert.match(planner, /disallowed_tools:\s*write/);
	assert.doesNotMatch(planner, /disallowed_tools:\s*ask_user/);
});
