import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { allowsAgentTool } from "../.pi/lib/agents-policy.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = root;
const projectRoot = root;
const PLANNING_CONTEXT = "harness/planning/planning-context";

function agentAllowsMutatingTools(agent) {
	const tools = agent.tools ?? [];
	return tools.includes("write") || tools.includes("edit");
}

function precheckHarnessSubagentSpawn(params, agents, phase) {
	const names = [];
	if (params.agent) names.push(params.agent);
	if (params.tasks) for (const t of params.tasks) names.push(t.agent);
	const byName = new Map(agents.map((a) => [a.name, a]));
	const mutating = names.filter((n) => {
		const cfg = byName.get(n);
		return cfg
			? agentAllowsMutatingTools(cfg)
			: n.startsWith("harness/running/");
	});
	if (phase === "plan" && mutating.length > 0) {
		return { ok: false, message: "Plan phase: cannot spawn mutating subagents" };
	}
	if ((params.tasks?.length ?? 0) > 1 && mutating.length > 1) {
		return { ok: false, message: "Parallel subagent tasks cannot include multiple mutating agents" };
	}
	return { ok: true };
}

test("plan phase rejects harness/running/executor spawn", () => {
	const agents = [
		{ name: "harness/running/executor", tools: ["read", "write", "edit", "bash"] },
	];
	const result = precheckHarnessSubagentSpawn(
		{ agent: "harness/running/executor" },
		agents,
		"plan",
	);
	assert.equal(result.ok, false);
});

test("parallel tasks reject multiple mutating harness agents", () => {
	const agents = [
		{ name: "harness/running/executor", tools: ["read", "write", "edit", "bash"] },
	];
	const result = precheckHarnessSubagentSpawn(
		{
			tasks: [
				{ agent: "harness/running/executor" },
				{ agent: "harness/running/executor" },
			],
		},
		agents,
		"execute",
	);
	assert.equal(result.ok, false);
});

test("planning-context policy allows read/bash/submit and blocks subagent", () => {
	const policyOpts = {
		packageRoot,
		projectRoot,
		agentId: PLANNING_CONTEXT,
		isSubprocess: true,
		isParentOrchestrator: false,
	};
	assert.ok(
		allowsAgentTool({ ...policyOpts, toolName: "read", toolInput: {} }),
	);
	assert.ok(
		allowsAgentTool({ ...policyOpts, toolName: "bash", toolInput: {} }),
	);
	assert.ok(
		allowsAgentTool({
			...policyOpts,
			toolName: "submit_planning_context",
			toolInput: {},
		}),
	);
	assert.ok(
		!allowsAgentTool({ ...policyOpts, toolName: "subagent", toolInput: {} }),
	);
	assert.ok(
		!allowsAgentTool({ ...policyOpts, toolName: "write", toolInput: {} }),
	);
});
