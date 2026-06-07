import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { describe, test } from "node:test";
import {
	liteReviewMaySkipAdversary,
	priorBlockMergeFromDisk,
} from "../.pi/lib/harness-lite-review-precheck.ts";
import { writeYamlFile } from "../.pi/lib/harness-yaml.ts";

describe("precheck disk block_merge", () => {
	test("priorBlockMergeFromDisk reads adversary block_merge not last_outcome alone", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-precheck-disk-"));
		const runId = "run-disk-block";
		const artifacts = join(root, ".pi", "harness", "runs", runId, "artifacts");
		await mkdir(artifacts, { recursive: true });
		await writeYamlFile(join(artifacts, "adversary-report.yaml"), {
			schema_version: "1.0.0",
			block_merge: true,
		});

		const blocked = await priorBlockMergeFromDisk({
			projectRoot: root,
			runId,
			lastOutcome: "pass",
		});
		assert.equal(blocked, true);
		await rm(root, { recursive: true, force: true });
	});

	test("liteReviewMaySkipAdversary false when block_merge on disk", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-precheck-lite-block-"));
		const runId = "run-lite-block";
		const artifacts = join(root, ".pi", "harness", "runs", runId, "artifacts");
		await mkdir(artifacts, { recursive: true });
		await writeYamlFile(join(artifacts, "adversary-report.yaml"), {
			schema_version: "1.0.0",
			block_merge: true,
		});
		await writeYamlFile(join(artifacts, "benchmark-log.yaml"), {
			schema_version: "1.0.0",
			adversary_repro: "pass",
		});

		const maySkip = await liteReviewMaySkipAdversary({
			projectRoot: root,
			runId,
			lastOutcome: "pass",
		});
		assert.equal(maySkip, false);
		await rm(root, { recursive: true, force: true });
	});

	test("liteReviewMaySkipAdversary true when repro pass and no block_merge", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-precheck-lite-ok-"));
		const runId = "run-lite-ok";
		const artifacts = join(root, ".pi", "harness", "runs", runId, "artifacts");
		await mkdir(artifacts, { recursive: true });
		await writeYamlFile(join(artifacts, "adversary-report.yaml"), {
			schema_version: "1.0.0",
			block_merge: false,
		});
		await writeYamlFile(join(artifacts, "benchmark-log.yaml"), {
			schema_version: "1.0.0",
			adversary_repro: "pass",
		});

		const maySkip = await liteReviewMaySkipAdversary({
			projectRoot: root,
			runId,
			lastOutcome: "pass",
		});
		assert.equal(maySkip, true);
		await rm(root, { recursive: true, force: true });
	});
});
