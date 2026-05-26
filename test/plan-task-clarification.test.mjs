import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
	assertTaskClarificationReadyForPlanWrite,
	computeTaskInputHash,
	isTaskClarificationReady,
} from "../.pi/lib/plan-task-clarification.ts";
import { validateHarnessSpawnTopology } from "../.pi/lib/harness-spawn-topology.ts";

test("computeTaskInputHash is stable for same inputs", () => {
	const a = computeTaskInputHash({
		sourceTask: "Fix bug",
		riskLevel: "med",
		quick: false,
	});
	const b = computeTaskInputHash({
		sourceTask: "Fix bug",
		riskLevel: "med",
		quick: false,
	});
	assert.equal(a, b);
	assert.notEqual(
		a,
		computeTaskInputHash({ sourceTask: "Fix bug", riskLevel: "high" }),
	);
});

test("write_harness_yaml blocks planning-context without clarification", async () => {
	const root = join(tmpdir(), `plan-clar-${randomUUID()}`);
	await mkdir(join(root, "artifacts"), { recursive: true });
	const block = await assertTaskClarificationReadyForPlanWrite(
		root,
		"artifacts/planning-context.yaml",
	);
	assert.equal(block.ok, false);
	assert.ok(block.message?.includes("task-clarification"));
});

test("spawn topology blocks planning agents without clarification", async () => {
	const projectRoot = join(tmpdir(), `proj-${randomUUID()}`);
	const runId = `run-${randomUUID()}`;
	await mkdir(
		join(projectRoot, ".pi", "harness", "runs", runId, "artifacts"),
		{ recursive: true },
	);
	const result = await validateHarnessSpawnTopology(
		["harness/planning/decompose"],
		"plan",
		{ projectRoot, runId },
	);
	assert.equal(result.ok, false);
	assert.ok(result.message?.includes("task clarification"));
});
