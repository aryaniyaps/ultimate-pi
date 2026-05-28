import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { executeSubmitPipeline } from "../.pi/lib/harness-subagent-submit-pipeline.ts";
import { specForSubmitTool } from "../.pi/lib/harness-subagent-submit-registry.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const specsDir = join(root, ".pi", "harness", "specs");

const hypothesisEvalDoc = {
	schema_version: "1.0.0",
	dimensions: {
		novelty: { score: 70, rationale: "Adequate novelty for the task." },
		coherence: { score: 75, rationale: "Coherent with stated task." },
		testability: { score: 72, rationale: "Falsifiable within one sprint." },
		impact: { score: 68, rationale: "Meaningful user impact." },
	},
	relevance: { passes: true, rationale: "Hypothesis addresses the user task." },
	human_summary: "Hypothesis is falsifiable and proportional.",
};

test("executeSubmitPipeline returns idempotent when artifact already valid", async () => {
	const projectRoot = join(tmpdir(), `submit-idem-${randomUUID()}`);
	const runId = `run-${randomUUID()}`;
	const runDir = join(projectRoot, ".pi", "harness", "runs", runId);
	await mkdir(join(runDir, "artifacts"), { recursive: true });

	const spec = specForSubmitTool("submit_hypothesis_validation");
	assert.ok(spec);

	const first = await executeSubmitPipeline({
		projectRoot,
		specsDir,
		spec,
		agentId: "harness/planning/hypothesis-validator",
		document: hypothesisEvalDoc,
		runId,
	});
	assert.equal(first.ok, true);
	assert.equal(first.idempotent, undefined);

	const second = await executeSubmitPipeline({
		projectRoot,
		specsDir,
		spec,
		agentId: "harness/planning/hypothesis-validator",
		document: hypothesisEvalDoc,
		runId,
	});
	assert.equal(second.ok, true);
	assert.equal(second.idempotent, true);
});

test("debate lane submit writes artifact once via applyDebateLane", async () => {
	const projectRoot = join(tmpdir(), `submit-lane-${randomUUID()}`);
	const runId = `run-${randomUUID()}`;
	const runDir = join(projectRoot, ".pi", "harness", "runs", runId);
	await mkdir(join(runDir, "artifacts"), { recursive: true });

	const spec = specForSubmitTool("submit_hypothesis_validation");
	const result = await executeSubmitPipeline({
		projectRoot,
		specsDir,
		spec,
		agentId: "harness/planning/hypothesis-validator",
		document: hypothesisEvalDoc,
		runId,
	});
	assert.equal(result.ok, true);
	const artifactPath = join(runDir, "artifacts", "hypothesis-validation-r1.yaml");
	const raw = await import("node:fs/promises").then((fs) =>
		fs.readFile(artifactPath, "utf-8"),
	);
	assert.match(raw, /human_summary:/);
});
