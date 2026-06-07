import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { describe, test } from "node:test";
import { runHarnessReviewPreflight } from "../.pi/scripts/harness-review-preflight.mjs";

describe("harness-review-preflight", () => {
	test("fails when benchmark-log missing", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-preflight-"));
		const runDir = join(root, "run");
		await mkdir(runDir, { recursive: true });
		const result = await runHarnessReviewPreflight({ runDir });
		assert.equal(result.ok, false);
		assert.match(result.reason ?? "", /benchmark-log/i);
		await rm(root, { recursive: true, force: true });
	});

	test("passes with fresh benchmark-log", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-preflight-ok-"));
		const runDir = join(root, "run");
		const artifacts = join(runDir, "artifacts");
		await mkdir(artifacts, { recursive: true });
		await writeFile(
			join(artifacts, "benchmark-log.yaml"),
			"schema_version: '1.0.0'\nharness_verify: pass\nsteer_attempt: 0\n",
		);
		const result = await runHarnessReviewPreflight({
			runDir,
			steerAttempt: 0,
		});
		assert.equal(result.ok, true);
		await rm(root, { recursive: true, force: true });
	});
});
