import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	classifyHarnessAgent,
	evaluateHarnessSubagentToolCall,
	isHarnessPlanningAgent,
	isSubmitToolName,
} from "../.pi/extensions/lib/harness-subagent-policy.ts";
import { evaluateSubagentToolCall } from "../.pi/extensions/lib/spawn-policy.ts";
import { parseHarnessAgentJson } from "../.pi/lib/harness-agent-output.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("isSubmitToolName is exported from harness-subagent-policy", () => {
	assert.equal(typeof isSubmitToolName, "function");
	assert.equal(isSubmitToolName("submit_decomposition_brief"), true);
	assert.equal(isSubmitToolName("read"), false);
});

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

test("planning decompose and hypothesis-validator classified as planner read-only", () => {
	assert.equal(classifyHarnessAgent("harness/planning/decompose"), "planner");
	assert.equal(
		classifyHarnessAgent("harness/planning/hypothesis"),
		"planner",
	);
	assert.equal(
		classifyHarnessAgent("harness/planning/hypothesis-validator"),
		"planner",
	);
	const evalWrite = evaluateHarnessSubagentToolCall(
		"write",
		{ path: "src/a.ts", content: "x" },
		"harness/planning/hypothesis-validator",
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
	assert.match(planPrompt, /harness\/planning\/hypothesis-validator/);
	assert.match(planPrompt, /harness\/planning\/stack-researcher/);
	assert.match(planPrompt, /validate-plan-dag/);
	assert.match(planPrompt, /research_brief/);
	assert.match(planPrompt, /approve_plan/);
	assert.match(planPrompt, /create_plan/);
	assert.doesNotMatch(planPrompt, /harness\/planner/);
	assert.doesNotMatch(planPrompt, /harness\/planning\/planner/);
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
		"harness/planning/hypothesis-validator",
	);
	assert.equal(approve.action, "block");
	const create = evaluateSubagentToolCall(
		"create_plan",
		"harness/planning/decompose",
	);
	assert.equal(create.action, "block");
});

	test("submit tools blocked outside subprocess", () => {
		const prev = process.env.PI_HARNESS_SUBPROCESS;
		delete process.env.PI_HARNESS_SUBPROCESS;
		const block = evaluateHarnessSubagentToolCall(
			"submit_scout_findings",
			{ document: { schema_version: "1.0.0", lane: "graphify", summary: "x" } },
			"harness/planning/scout-graphify",
		);
		assert.equal(block.action, "block");
		if (prev !== undefined) process.env.PI_HARNESS_SUBPROCESS = prev;
	});

	test("planning scout agent disallows approve_plan in frontmatter", () => {
	const scout = readFileSync(
		join(root, ".pi/agents/harness/planning/scout-graphify.md"),
		"utf-8",
	);
	assert.match(scout, /disallowed_tools:.*approve_plan/);
	assert.match(scout, /lane.*graphify/);
});
