import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { validatePlanApprovalReadiness } from "../.pi/extensions/lib/plan-approval-readiness.ts";

const PLANNING_CONTEXT = `schema_version: "1.0.0"
status: ok
summary: Recon complete
coverage:
  architecture:
    status: ok
    tools_used: [graphify query]
  structure:
    status: ok
    tools_used: [sg]
  semantic:
    status: skipped
findings: []
`;

const DECOMP = `schema_version: "1.0.0"
problem_restatement: "Test"
problem_types: [design]
scope:
  narrowed_focus: "f"
  excluded: []
hard_constraints: []
soft_constraints: []
success_metrics: []
prior_art:
  best_approach: "a"
  gap: "g"
  dead_ends: []
tensions: []
core_tension: "t"
`;

const HYP = `schema_version: "1.0.0"
hypothesis_statement: "h"
mechanism: "m"
predictions: []
experiments: []
falsification: "f"
`;

async function seedRun(projectRoot, runId, extras = {}) {
	const art = join(projectRoot, ".pi", "harness", "runs", runId, "artifacts");
	await mkdir(art, { recursive: true });
	await writeFile(join(art, "planning-context.yaml"), extras.planningContext ?? PLANNING_CONTEXT);
	await writeFile(join(art, "decomposition.yaml"), extras.decomposition ?? DECOMP);
	await writeFile(join(art, "hypothesis.yaml"), extras.hypothesis ?? HYP);
	if (extras.impl) await writeFile(join(art, "implementation-research.yaml"), extras.impl);
	if (extras.stack) await writeFile(join(art, "stack.yaml"), extras.stack);
}

test("accepts planning-context.yaml with architecture and structure coverage", async () => {
	const projectRoot = join(tmpdir(), `readiness-${randomUUID()}`);
	const runId = "run-1";
	await seedRun(projectRoot, runId, {
		impl: "schema_version: \"1.0.0\"\nsummary: i\n",
		stack: "schema_version: \"1.0.0\"\nsummary: s\n",
	});
	const result = await validatePlanApprovalReadiness(projectRoot, runId, {
		risk_level: "med",
	});
	assert.equal(result.ok, true, result.errors.join("; "));
});

test("rejects missing reconnaissance when no planning-context", async () => {
	const projectRoot = join(tmpdir(), `readiness-${randomUUID()}`);
	const runId = "run-2";
	const art = join(projectRoot, ".pi", "harness", "runs", runId, "artifacts");
	await mkdir(art, { recursive: true });
	await writeFile(join(art, "decomposition.yaml"), DECOMP);
	await writeFile(join(art, "hypothesis.yaml"), HYP);
	const result = await validatePlanApprovalReadiness(projectRoot, runId);
	assert.equal(result.ok, false);
	assert.ok(result.errors.some((e) => e.includes("planning-context")));
});

test("scout artifacts no longer satisfy readiness without planning-context", async () => {
	const projectRoot = join(tmpdir(), `readiness-${randomUUID()}`);
	const runId = "run-3";
	const art = join(projectRoot, ".pi", "harness", "runs", runId, "artifacts");
	await mkdir(art, { recursive: true });
	await writeFile(join(art, "scout-graphify.yaml"), 'schema_version: "1.0.0"\nstatus: ok\nsummary: old\n');
	await writeFile(join(art, "decomposition.yaml"), DECOMP);
	await writeFile(join(art, "hypothesis.yaml"), HYP);
	await writeFile(join(art, "implementation-research.yaml"), 'schema_version: "1.0.0"\nsummary: i\n');
	await writeFile(join(art, "stack.yaml"), 'schema_version: "1.0.0"\nsummary: s\n');
	const result = await validatePlanApprovalReadiness(projectRoot, runId, {
		risk_level: "med",
	});
	assert.equal(result.ok, false);
	assert.ok(result.errors.some((e) => e.includes("planning-context")));
});
