import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	allowsAgentTool,
	getAgentKind,
	isHarnessPlanningAgent,
} from "../.pi/lib/agents-policy.mjs";
import { isSubmitToolName } from "../.pi/lib/harness-subagent-submit-registry.ts";
import { evaluateSubagentToolCall } from "../.pi/lib/harness-spawn-policy.ts";
import { parseHarnessAgentJson } from "../.pi/lib/harness-agent-output.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = root;
const projectRoot = root;

function evaluateHarnessSubagentToolCall(toolName, toolInput, agentId) {
	const isParent = agentId === "parent-orchestrator";
	const allowed = allowsAgentTool({
		packageRoot,
		projectRoot,
		agentId,
		toolName,
		toolInput,
		isSubprocess: !isParent && Boolean(process.env.PI_HARNESS_SUBPROCESS),
		isParentOrchestrator: isParent,
	});
	return allowed
		? { action: "allow" }
		: {
				action: "block",
				reason: `agents-policy: ${toolName} blocked for ${agentId}`,
			};
}

test("isSubmitToolName is exported from submit registry", () => {
	assert.equal(typeof isSubmitToolName, "function");
	assert.equal(isSubmitToolName("submit_decomposition_brief"), true);
	assert.equal(isSubmitToolName("read"), false);
});

test("evaluator blocks write and mutating bash", () => {
	const write = evaluateHarnessSubagentToolCall(
		"write",
		{ path: "src/a.ts", content: "x" },
		"harness/reviewing/evaluator",
	);
	assert.equal(write.action, "block");

	const bash = evaluateHarnessSubagentToolCall(
		"bash",
		{ command: "git commit -m test" },
		"harness/reviewing/evaluator",
	);
	assert.equal(bash.action, "block");

	const read = evaluateHarnessSubagentToolCall(
		"read",
		{ path: "src/a.ts" },
		"harness/reviewing/evaluator",
	);
	assert.equal(read.action, "allow");
});

test("evaluator blocks mutating ctx_batch_execute", () => {
	const batch = evaluateHarnessSubagentToolCall(
		"ctx_batch_execute",
		{
			commands: [{ label: "commit", command: "git commit -m test" }],
			queries: ["what changed"],
		},
		"harness/reviewing/evaluator",
	);
	assert.equal(batch.action, "block");

	const readOnly = evaluateHarnessSubagentToolCall(
		"ctx_execute",
		{ language: "shell", code: "ls -la" },
		"harness/reviewing/evaluator",
	);
	assert.equal(readOnly.action, "allow");
});

test("executor allows write", () => {
	const write = evaluateHarnessSubagentToolCall(
		"write",
		{ path: "src/a.ts", content: "x" },
		"harness/running/executor",
	);
	assert.equal(write.action, "allow");
});

test("hypothesis-validator cannot use bash or repo search tools", () => {
	const bash = evaluateHarnessSubagentToolCall(
		"bash",
		{ command: "graphify query 'foo'" },
		"harness/planning/hypothesis-validator",
	);
	assert.equal(bash.action, "block");
	const grep = evaluateHarnessSubagentToolCall(
		"grep",
		{ pattern: "foo" },
		"harness/planning/hypothesis-validator",
	);
	assert.equal(grep.action, "block");
	const read = evaluateHarnessSubagentToolCall(
		"read",
		{ path: "artifacts/hypothesis.yaml" },
		"harness/planning/hypothesis-validator",
	);
	assert.equal(read.action, "allow");
	const readDecomp = evaluateHarnessSubagentToolCall(
		"read",
		{ path: "artifacts/decomposition.yaml" },
		"harness/planning/hypothesis-validator",
	);
	assert.equal(readDecomp.action, "block");
});

test("plan-evaluator allows sg bash only", () => {
	const sg = evaluateHarnessSubagentToolCall(
		"bash",
		{ command: "sg -p 'function $NAME' .pi/lib" },
		"harness/planning/plan-evaluator",
	);
	assert.equal(sg.action, "allow");
	const graphify = evaluateHarnessSubagentToolCall(
		"bash",
		{ command: "graphify update ." },
		"harness/planning/plan-evaluator",
	);
	assert.equal(graphify.action, "block");
});

test("implementation-researcher cannot use bash", () => {
	const bash = evaluateHarnessSubagentToolCall(
		"bash",
		{ command: "npm test" },
		"harness/planning/implementation-researcher",
	);
	assert.equal(bash.action, "block");
});

test("planning decompose and hypothesis-validator classified as planner read-only", () => {
	assert.equal(
		getAgentKind(packageRoot, projectRoot, "harness/planning/decompose"),
		"planner",
	);
	assert.equal(
		getAgentKind(packageRoot, projectRoot, "harness/planning/hypothesis"),
		"planner",
	);
	assert.equal(
		getAgentKind(packageRoot, projectRoot, "harness/planning/hypothesis-validator"),
		"planner",
	);
	const evalWrite = evaluateHarnessSubagentToolCall(
		"write",
		{ path: "src/a.ts", content: "x" },
		"harness/planning/hypothesis-validator",
	);
	assert.equal(evalWrite.action, "block");
});

test("planning-context classified as planner read-only", () => {
	assert.equal(
		getAgentKind(packageRoot, projectRoot, "harness/planning/planning-context"),
		"planner",
	);
	assert.equal(
		isHarnessPlanningAgent("harness/planning/planning-context"),
		true,
	);
	const write = evaluateHarnessSubagentToolCall(
		"write",
		{ path: "src/a.ts", content: "x" },
		"harness/planning/planning-context",
	);
	assert.equal(write.action, "block");
});

test("planning-context blocks graphify update bash", () => {
	const bash = evaluateHarnessSubagentToolCall(
		"bash",
		{ command: "graphify update ." },
		"harness/planning/planning-context",
	);
	assert.equal(bash.action, "block");
	const query = evaluateHarnessSubagentToolCall(
		"bash",
		{ command: "graphify query 'how does harness plan work'" },
		"harness/planning/planning-context",
	);
	assert.equal(query.action, "allow");
});

test("parseHarnessAgentJson extracts fenced block", () => {
	const text = `Summary here.\n\`\`\`json\n{"status":"ready","plan_packet":{"plan_id":"p1"}}\n\`\`\``;
	const parsed = parseHarnessAgentJson(text);
	assert.equal(parsed.ok, true);
	assert.equal(parsed.value.status, "ready");
});

test("harness-plan prompt references planning context and Darwin pipeline agents", () => {
	const planPrompt = readFileSync(
		join(root, ".pi/prompts/harness-plan.md"),
		"utf-8",
	);
	assert.match(planPrompt, /planning-context\.yaml/);
	assert.match(planPrompt, /harness\/planning\/planning-context/);
	assert.doesNotMatch(planPrompt, /scout-\*/i);
	assert.doesNotMatch(planPrompt, /spawn legacy/i);
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

test("parent orchestrator allows subagent and plan gates via spawn policy", () => {
	const spawn = evaluateSubagentToolCall("subagent", "parent-orchestrator", {
		isParentOrchestrator: true,
	});
	assert.equal(spawn.action, "allow");
	const ask = evaluateSubagentToolCall("ask_user", "parent-orchestrator", {
		isParentOrchestrator: true,
	});
	assert.equal(ask.action, "allow");
	const approve = evaluateSubagentToolCall("approve_plan", "parent-orchestrator", {
		isParentOrchestrator: true,
	});
	assert.equal(approve.action, "allow");
});

test("harness subprocess blocks nested subagent tool", () => {
	const nested = evaluateSubagentToolCall(
		"subagent",
		"harness/planning/decompose",
	);
	assert.equal(nested.action, "block");
});

test("planning-context blocks ask_user via spawn policy", () => {
	const ask = evaluateSubagentToolCall(
		"ask_user",
		"harness/planning/planning-context",
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
		"submit_planning_context",
		{ document: { schema_version: "1.0.0", status: "ok", summary: "x" } },
		"harness/planning/planning-context",
	);
	assert.equal(block.action, "block");
	if (prev !== undefined) process.env.PI_HARNESS_SUBPROCESS = prev;
});

test("planning-context agent frontmatter has no tool lists (agents.policy.yaml SSOT)", () => {
	const agent = readFileSync(
		join(root, ".pi/agents/harness/planning/planning-context.md"),
		"utf-8",
	);
	assert.doesNotMatch(agent, /^tools:/m);
	assert.doesNotMatch(agent, /^disallowed_tools:/m);
	assert.match(agent, /submit_planning_context/);
});
