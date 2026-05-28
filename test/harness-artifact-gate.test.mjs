import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
	validateHarnessArtifactFile,
	validateHarnessArtifactPaths,
} from "../.pi/lib/harness-artifact-gate.ts";

const specsDir = join(process.cwd(), ".pi/harness/specs");

test("validateHarnessArtifactFile rejects empty decomposition", async () => {
	const root = join(tmpdir(), `harness-artifact-gate-${randomUUID()}`);
	await mkdir(join(root, "artifacts"), { recursive: true });
	await writeFile(join(root, "artifacts/decomposition.yaml"), "\n", "utf-8");
	const gate = await validateHarnessArtifactFile(
		root,
		"artifacts/decomposition.yaml",
		specsDir,
	);
	assert.equal(gate.ok, false);
	assert.ok(gate.errors.some((e) => e.includes("empty")));
});

test("hypothesis gate requires decomposition prerequisite on disk", async () => {
	const root = join(tmpdir(), `harness-artifact-gate-${randomUUID()}`);
	await mkdir(join(root, "artifacts"), { recursive: true });
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
	await writeFile(join(root, "artifacts/decomposition.yaml"), decomp, "utf-8");
	const withoutDecomp = join(tmpdir(), `harness-artifact-gate-${randomUUID()}`);
	await mkdir(join(withoutDecomp, "artifacts"), { recursive: true });
	await writeFile(
		join(withoutDecomp, "artifacts/hypothesis.yaml"),
		"schema_version: '1.0.0'\n",
		"utf-8",
	);
	const blocked = await validateHarnessArtifactPaths(
		withoutDecomp,
		["artifacts/hypothesis.yaml"],
		specsDir,
	);
	assert.equal(blocked.ok, false);
	assert.ok(
		blocked.errors.some((e) => e.includes("prerequisite missing")),
	);
	const decompOnly = await validateHarnessArtifactPaths(
		root,
		["artifacts/decomposition.yaml"],
		specsDir,
	);
	assert.equal(decompOnly.ok, true);
});

const READY_CLARIFICATION = `schema_version: "1.0.0"
status: ready
source_task: "Add harness feature"
clarified_task: "Add harness feature with tests and documentation updates."
success_definition: "Feature ships with passing harness-verify"
in_scope:
  - ".pi/harness"
out_of_scope:
  - unrelated product code
acceptance_checks_draft:
  - "node .pi/scripts/harness-verify.mjs passes"
assumptions: []
risk_level: med
unresolved_questions: []
clarification_rounds: 1
task_input_hash: deadbeefcafebabe
`;

test("planning-context requires ready task-clarification", async () => {
	const root = join(tmpdir(), `harness-artifact-gate-${randomUUID()}`);
	await mkdir(join(root, "artifacts"), { recursive: true });
	await writeFile(
		join(root, "artifacts/planning-context.yaml"),
		`schema_version: "1.0.0"
status: ok
summary: "Recon without clarification"
coverage:
  architecture:
    status: ok
  structure:
    status: ok
`,
		"utf-8",
	);
	const blocked = await validateHarnessArtifactPaths(
		root,
		["artifacts/planning-context.yaml"],
		specsDir,
	);
	assert.equal(blocked.ok, false);
	assert.ok(
		blocked.errors.some((e) => e.includes("task-clarification")),
	);
});

test("planning-context passes when task-clarification is ready", async () => {
	const root = join(tmpdir(), `harness-artifact-gate-${randomUUID()}`);
	await mkdir(join(root, "artifacts"), { recursive: true });
	await writeFile(
		join(root, "artifacts/task-clarification.yaml"),
		READY_CLARIFICATION,
		"utf-8",
	);
	await writeFile(
		join(root, "artifacts/planning-context.yaml"),
		`schema_version: "1.0.0"
status: ok
summary: "Recon after clarification"
task_ref: artifacts/task-clarification.yaml
coverage:
  architecture:
    status: ok
  structure:
    status: ok
`,
		"utf-8",
	);
	const gate = await validateHarnessArtifactPaths(
		root,
		["artifacts/planning-context.yaml"],
		specsDir,
	);
	assert.equal(gate.ok, true);
});

test("validates debate round hypothesis-validation artifact schema", async () => {
	const root = join(tmpdir(), `harness-artifact-gate-${randomUUID()}`);
	await mkdir(join(root, "artifacts"), { recursive: true });
	const doc = `schema_version: "1.0.0"
dimensions:
  novelty:
    score: 70
    rationale: Adequate novelty for the task.
  coherence:
    score: 75
    rationale: Coherent with stated task.
  testability:
    score: 72
    rationale: Falsifiable within one sprint.
  impact:
    score: 68
    rationale: Meaningful user impact.
relevance:
  passes: true
  rationale: Hypothesis addresses the user task.
human_summary: Hypothesis is falsifiable and proportional.
`;
	await writeFile(
		join(root, "artifacts", "hypothesis-validation-r1.yaml"),
		doc,
		"utf-8",
	);
	const gate = await validateHarnessArtifactFile(
		root,
		"artifacts/hypothesis-validation-r1.yaml",
		specsDir,
		{ skipPrerequisites: true },
	);
	assert.equal(gate.ok, true, gate.errors.join("; "));
});

test("task-clarification gate rejects unresolved questions when ready", async () => {
	const root = join(tmpdir(), `harness-artifact-gate-${randomUUID()}`);
	await mkdir(join(root, "artifacts"), { recursive: true });
	const bad = READY_CLARIFICATION.replace(
		"unresolved_questions: []",
		'unresolved_questions: ["still unclear"]',
	);
	await writeFile(join(root, "artifacts/task-clarification.yaml"), bad, "utf-8");
	const gate = await validateHarnessArtifactPaths(
		root,
		["artifacts/task-clarification.yaml"],
		specsDir,
	);
	assert.equal(gate.ok, false);
	assert.ok(gate.errors.some((e) => e.includes("unresolved_questions")));
});
