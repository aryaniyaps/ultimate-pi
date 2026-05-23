import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { validateHarnessSpawnTopology } from "../.pi/extensions/lib/harness-spawn-topology.ts";

test("rejects decompose and hypothesis in same parallel batch", async () => {
	const result = await validateHarnessSpawnTopology(
		["harness/planning/decompose", "harness/planning/hypothesis"],
		"plan",
		{ parallelTaskCount: 2 },
	);
	assert.equal(result.ok, false);
	assert.match(result.message ?? "", /decompose and hypothesis/i);
});

test("allows parallel plan-evaluator and plan-adversary for parallel_probes", async () => {
	const result = await validateHarnessSpawnTopology(
		[
			"harness/planning/plan-evaluator",
			"harness/planning/plan-adversary",
		],
		"plan",
		{ parallelTaskCount: 2 },
	);
	assert.equal(result.ok, true);
});

test("rejects three parallel debate lane agents", async () => {
	const result = await validateHarnessSpawnTopology(
		[
			"harness/planning/plan-evaluator",
			"harness/planning/plan-adversary",
			"harness/planning/review-integrator",
		],
		"plan",
		{ parallelTaskCount: 3 },
	);
	assert.equal(result.ok, false);
	assert.match(result.message ?? "", /Review Gate/i);
});

test("blocks hypothesis spawn without decomposition artifact", async () => {
	const projectRoot = join(tmpdir(), `harness-precheck-${randomUUID()}`);
	const runId = "run-test";
	await mkdir(
		join(projectRoot, ".pi", "harness", "runs", runId, "artifacts"),
		{ recursive: true },
	);
	const result = await validateHarnessSpawnTopology(
		["harness/planning/hypothesis"],
		"plan",
		{ projectRoot, runId },
	);
	assert.equal(result.ok, false);
	assert.match(result.message ?? "", /decomposition\.yaml/i);

	const decomp = `schema_version: "1.0.0"
problem_restatement: "Test problem"
problem_types: [design]
scope:
  narrowed_focus: "Test focus"
  excluded: ["out"]
hard_constraints: ["none"]
soft_constraints: ["prefer simple"]
success_metrics: ["done"]
prior_art:
  best_approach: "prior"
  gap: "gap"
  dead_ends: ["dead"]
tensions:
  - claim_a: "a"
    claim_b: "b"
    why_matters: "matters"
core_tension: "Core tension paragraph."
`;
	await writeFile(
		join(
			projectRoot,
			".pi",
			"harness",
			"runs",
			runId,
			"artifacts",
			"decomposition.yaml",
		),
		decomp,
		"utf-8",
	);
	const ok = await validateHarnessSpawnTopology(
		["harness/planning/hypothesis"],
		"plan",
		{ projectRoot, runId },
	);
	assert.equal(ok.ok, true);
});

test("rejects mixing planning-context with legacy scouts in one batch", async () => {
	const result = await validateHarnessSpawnTopology(
		[
			"harness/planning/planning-context",
			"harness/planning/scout-graphify",
		],
		"plan",
		{ parallelTaskCount: 2 },
	);
	assert.equal(result.ok, false);
	assert.match(result.message ?? "", /mix legacy scout/i);
});

test("allows single planning-context subagent", async () => {
	const result = await validateHarnessSpawnTopology(
		["harness/planning/planning-context"],
		"plan",
	);
	assert.equal(result.ok, true);
});
