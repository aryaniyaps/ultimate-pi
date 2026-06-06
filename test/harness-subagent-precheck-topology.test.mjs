import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { validateHarnessSpawnTopology } from "../.pi/lib/harness-spawn-topology.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

async function seedTaskClarificationReady(root, runId) {
	const clarDir = join(
		root,
		".pi",
		"harness",
		"runs",
		runId,
		"artifacts",
	);
	await mkdir(clarDir, { recursive: true });
	await writeFile(
		join(clarDir, "task-clarification.yaml"),
		`schema_version: "1.0.0"
status: ready
clarified_task: "Harness topology unit test task with enough detail."
unresolved_questions: []
user_engagement:
  source: ask_user
`,
		"utf-8",
	);
}

test("rejects decompose and hypothesis in same parallel batch", async () => {
	const result = await validateHarnessSpawnTopology(
		["harness/planning/decompose", "harness/planning/hypothesis"],
		"plan",
		{ parallelTaskCount: 2 },
	);
	assert.equal(result.ok, false);
	assert.match(result.message ?? "", /decompose and hypothesis/i);
});

test("allows parallel review evaluator and adversary when HARNESS_REVIEW_PARALLEL=1", async () => {
	const prev = process.env.HARNESS_REVIEW_PARALLEL;
	process.env.HARNESS_REVIEW_PARALLEL = "1";
	const result = await validateHarnessSpawnTopology(
		["harness/reviewing/evaluator", "harness/reviewing/adversary"],
		"evaluate",
		{ parallelTaskCount: 2 },
	);
	process.env.HARNESS_REVIEW_PARALLEL = prev;
	assert.equal(result.ok, true);
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
	await seedTaskClarificationReady(projectRoot, runId);
	const ok = await validateHarnessSpawnTopology(
		["harness/planning/hypothesis"],
		"plan",
		{ projectRoot, runId },
	);
	assert.equal(ok.ok, true);
});

test("rejects multiple planning-context agents in one batch", async () => {
	const result = await validateHarnessSpawnTopology(
		[
			"harness/planning/planning-context",
			"harness/planning/planning-context",
		],
		"plan",
		{ parallelTaskCount: 2 },
	);
	assert.equal(result.ok, false);
	assert.match(result.message ?? "", /At most one planning-context/i);
});

test("allows single planning-context subagent", async () => {
	const result = await validateHarnessSpawnTopology(
		["harness/planning/planning-context"],
		"plan",
	);
	assert.equal(result.ok, true);
});

test("blocks duplicate spawn when deliverable artifact already passes gate", async () => {
	const runId = `run-dedup-${randomUUID()}`;
	const runRoot = join(
		projectRoot,
		".pi",
		"harness",
		"runs",
		runId,
		"artifacts",
	);
	await mkdir(runRoot, { recursive: true });

	await writeFile(
		join(runRoot, "stack.yaml"),
		`schema_version: "1.0.0"
problem_framing: "Unit test stack brief for spawn dedup."
constraints:
  - read-only harness subprocess
options:
  - name: current-stack
    category: extend
    fit_summary: Fits the existing harness repo without migration.
    tradeoffs:
      pros:
        - already integrated
      cons:
        - none material
    risks: []
    evidence_refs:
      - package.json
    recommendation_rank: 1
recommended_primary: current-stack
rationale: Extend the existing stack for this harness test.
`,
		"utf-8",
	);
	await seedTaskClarificationReady(projectRoot, runId);

	const blocked = await validateHarnessSpawnTopology(
		["harness/planning/stack-researcher"],
		"plan",
		{ projectRoot, runId },
	);
	assert.equal(blocked.ok, false);
	assert.match(blocked.message ?? "", /Duplicate spawn blocked/i);
	assert.match(blocked.message ?? "", /stack-researcher/i);

	process.env.HARNESS_FORCE_RESPAWN = "1";
	const forced = await validateHarnessSpawnTopology(
		["harness/planning/stack-researcher"],
		"plan",
		{ projectRoot, runId },
	);
	delete process.env.HARNESS_FORCE_RESPAWN;
	assert.equal(forced.ok, true);
});
