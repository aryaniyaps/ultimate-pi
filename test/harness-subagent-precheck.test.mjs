import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Mirror vendor/pi-subagents computeEffectiveTools for scout contract tests. */
function computeEffectiveTools(allowed, disallowed, agentName) {
	const deny = new Set(
		(disallowed ?? []).map((t) => t.trim()).filter(Boolean),
	);
	deny.add("subagent");
	deny.add("Agent");
	if (agentName.startsWith("harness/")) deny.add("subagent");
	return allowed.filter((t) => !deny.has(t));
}

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
			: n.startsWith("harness/executor");
	});
	if (phase === "plan" && mutating.length > 0) {
		return { ok: false, message: "Plan phase: cannot spawn mutating subagents" };
	}
	if ((params.tasks?.length ?? 0) > 1 && mutating.length > 1) {
		return { ok: false, message: "Parallel subagent tasks cannot include multiple mutating agents" };
	}
	return { ok: true };
}

test("plan phase rejects harness/executor spawn", () => {
	const agents = [
		{ name: "harness/executor", tools: ["read", "write", "edit", "bash"] },
	];
	const result = precheckHarnessSubagentSpawn(
		{ agent: "harness/executor" },
		agents,
		"plan",
	);
	assert.equal(result.ok, false);
});

test("parallel tasks reject multiple mutating harness agents", () => {
	const agents = [
		{ name: "harness/executor", tools: ["read", "write", "edit", "bash"] },
	];
	const result = precheckHarnessSubagentSpawn(
		{
			tasks: [
				{ agent: "harness/executor" },
				{ agent: "harness/executor" },
			],
		},
		agents,
		"execute",
	);
	assert.equal(result.ok, false);
});

test("scout effective tools omit grep find and subagent", () => {
	const scoutPath = join(
		process.cwd(),
		".pi/agents/harness/planning/scout-graphify.md",
	);
	const body = readFileSync(scoutPath, "utf-8");
	const toolsMatch = body.match(/^tools:\s*(.+)$/m);
	const disallowedMatch = body.match(/^disallowed_tools:\s*(.+)$/m);
	assert.ok(toolsMatch);
	const allowed = toolsMatch[1].split(",").map((s) => s.trim());
	const disallowed = (disallowedMatch?.[1] ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	const effective = computeEffectiveTools(
		allowed,
		disallowed,
		"harness/planning/scout-graphify",
	);
	assert.ok(effective.includes("read"));
	assert.ok(!effective.includes("grep"));
	assert.ok(!effective.includes("find"));
	assert.ok(!effective.includes("subagent"));
});
