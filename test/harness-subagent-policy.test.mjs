import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	classifyHarnessAgent,
	evaluateHarnessSubagentToolCall,
	isHarnessPlanningAgent,
} from "../.pi/extensions/lib/harness-subagents/harness-subagent-policy.ts";
import { evaluateSubagentToolCall } from "../.pi/extensions/lib/harness-subagents/spawn-policy.ts";
import { parseHarnessAgentJson } from "../.pi/lib/harness-agent-output.ts";

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

test("planning decompose and hypothesis-eval classified as planner read-only", () => {
	assert.equal(classifyHarnessAgent("harness/planning/decompose"), "planner");
	assert.equal(
		classifyHarnessAgent("harness/planning/hypothesis"),
		"planner",
	);
	assert.equal(
		classifyHarnessAgent("harness/planning/hypothesis-eval"),
		"planner",
	);
	const evalWrite = evaluateHarnessSubagentToolCall(
		"write",
		{ path: "src/a.ts", content: "x" },
		"harness/planning/hypothesis-eval",
	);
	assert.equal(evalWrite.action, "block");
});

test("planning scout classified as planner read-only", () => {
	assert.equal(
		classifyHarnessAgent("harness/planning/scout-graphify"),
		"planner",
	);
	assert.equal(isHarnessPlanningAgent("harness/planning/scout-structure"), true);
	const write = evaluateHarnessSubagentToolCall(
		"write",
		{ path: "src/a.ts", content: "x" },
		"harness/planning/scout-graphify",
	);
	assert.equal(write.action, "block");
});

test("planning scout blocks graphify update bash", () => {
	const bash = evaluateHarnessSubagentToolCall(
		"bash",
		{ command: "graphify update ." },
		"harness/planning/scout-graphify",
	);
	assert.equal(bash.action, "block");
	const query = evaluateHarnessSubagentToolCall(
		"bash",
		{ command: "graphify query 'how does harness plan work'" },
		"harness/planning/scout-graphify",
	);
	assert.equal(query.action, "allow");
});

test("parseHarnessAgentJson extracts fenced block", () => {
	const text = `Summary here.\n\`\`\`json\n{"status":"ready","plan_packet":{"plan_id":"p1"}}\n\`\`\``;
	const parsed = parseHarnessAgentJson(text);
	assert.equal(parsed.ok, true);
	assert.equal(parsed.value.status, "ready");
});

test("harness-plan prompt references Darwin pipeline agents not planner spawn", () => {
	const planPrompt = readFileSync(
		join(root, ".pi/prompts/harness-plan.md"),
		"utf-8",
	);
	assert.match(planPrompt, /harness\/planning\/scout-graphify/);
	assert.match(planPrompt, /harness\/planning\/decompose/);
	assert.match(planPrompt, /harness\/planning\/hypothesis/);
	assert.match(planPrompt, /harness\/planning\/hypothesis-eval/);
	assert.match(planPrompt, /research_brief/);
	assert.match(planPrompt, /approve_plan/);
	assert.match(planPrompt, /create_plan/);
	assert.match(planPrompt, /Do \*\*not\*\* spawn.*harness\/planner/);
	assert.doesNotMatch(planPrompt, /spawn.*harness\/planner.*once/i);
});

test("planning scouts block ask_user via spawn policy", () => {
	const ask = evaluateSubagentToolCall(
		"ask_user",
		"harness/planning/scout-graphify",
	);
	assert.equal(ask.action, "block");
});

test("approve_plan and create_plan blocked in all subagents", () => {
	const approve = evaluateSubagentToolCall(
		"approve_plan",
		"harness/planning/plan-adversary",
	);
	assert.equal(approve.action, "block");
	const create = evaluateSubagentToolCall(
		"create_plan",
		"harness/planner",
	);
	assert.equal(create.action, "block");
});

test("planning scout agent disallows approve_plan in frontmatter", () => {
	const scout = readFileSync(
		join(root, ".pi/agents/harness/planning/scout-graphify.md"),
		"utf-8",
	);
	assert.match(scout, /disallowed_tools:.*approve_plan/);
	assert.match(scout, /lane.*graphify/);
});

test("deprecated harness planner shim says do not spawn", () => {
	const shim = readFileSync(
		join(root, ".pi/agents/harness/planner.md"),
		"utf-8",
	);
	assert.match(shim, /DEPRECATED/i);
	assert.match(shim, /Do not spawn/i);
});
