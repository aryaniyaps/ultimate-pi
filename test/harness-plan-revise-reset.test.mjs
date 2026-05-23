import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { archivePlanRevisionArtifacts } from "../.pi/extensions/harness-run-context.ts";

test("archivePlanRevisionArtifacts moves stale plan debate and planning artifacts", async () => {
	const projectRoot = await mkdtemp(join(tmpdir(), "harness-revise-reset-"));
	const runId = "run-123";
	const runDir = join(projectRoot, ".pi", "harness", "runs", runId);
	const artifactsDir = join(runDir, "artifacts");
	const debatesDir = join(projectRoot, ".pi", "harness", "debates");
	await mkdir(artifactsDir, { recursive: true });
	await mkdir(join(runDir, "debate-messenger"), { recursive: true });
	await mkdir(debatesDir, { recursive: true });

	await writeFile(join(runDir, "plan-packet.yaml"), "plan: old\n");
	await writeFile(join(runDir, "plan-review.md"), "old review\n");
	await writeFile(join(runDir, "research-brief.yaml"), "old research\n");
	await writeFile(join(runDir, "debate-messenger", "state.json"), "{}\n");
	await writeFile(join(artifactsDir, "decomposition.yaml"), "old decomposition\n");
	await writeFile(join(artifactsDir, "review-round-r1.yaml"), "old round\n");
	await writeFile(join(artifactsDir, "repair-brief.yaml"), "keep repair\n");
	await writeFile(join(debatesDir, `plan-${runId}.jsonl`), '{"kind":"round"}\n');

	const reset = await archivePlanRevisionArtifacts({
		projectRoot,
		runId,
		reason: "review_plan_gap_revise",
		recordedAt: "2026-05-24T00:00:00.000Z",
	});

	assert.deepEqual(
		reset.moved.sort(),
		[
			".pi/harness/debates/plan-run-123.jsonl",
			"artifacts/decomposition.yaml",
			"artifacts/review-round-r1.yaml",
			"debate-messenger",
			"plan-packet.yaml",
			"plan-review.md",
			"research-brief.yaml",
		].sort(),
	);
	assert.equal(existsSync(join(runDir, "plan-packet.yaml")), false);
	assert.equal(existsSync(join(artifactsDir, "decomposition.yaml")), false);
	assert.equal(existsSync(join(artifactsDir, "repair-brief.yaml")), true);
	assert.equal(existsSync(join(debatesDir, `plan-${runId}.jsonl`)), false);

	const manifest = JSON.parse(
		await readFile(join(reset.archiveDir, "revision-reset.json"), "utf-8"),
	);
	assert.equal(manifest.reason, "review_plan_gap_revise");
	assert.equal(manifest.run_id, runId);
});
