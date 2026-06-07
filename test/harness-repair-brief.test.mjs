import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { describe, test } from "node:test";
import { synthesizeRepairBrief } from "../.pi/lib/harness-repair-brief.ts";
import { writeYamlFile } from "../.pi/lib/harness-yaml.ts";

describe("synthesizeRepairBrief", () => {
	test("includes repro_commands and gap_kind from adversary", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-repair-brief-"));
		const runId = "run-brief-1";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		const artifacts = join(runDir, "artifacts");
		await mkdir(artifacts, { recursive: true });
		await writeYamlFile(join(artifacts, "eval-verdict.yaml"), {
			schema_version: "1.0.0",
			run_id: runId,
			status: "pass",
		});
		await writeYamlFile(join(artifacts, "adversary-report.yaml"), {
			schema_version: "1.0.0",
			run_id: runId,
			block_merge: true,
			repro_commands: [{ cmd: "npx vitest run test/widget.test.mjs" }],
			repro_steps: ["Click resume in the widget"],
		});
		await writeYamlFile(join(artifacts, "benchmark-log.yaml"), {
			schema_version: "1.0.0",
			harness_verify: "pass",
		});

		const brief = await synthesizeRepairBrief({
			runId,
			projectRoot: root,
			steerAttempt: 1,
		});

		assert.equal(brief.schema_version, "1.1.0");
		assert.equal(brief.remediation_class, "implementation_gap");
		assert.equal(brief.must_pass_before_handoff, true);
		assert.deepEqual(brief.repro_commands, [
			"npx vitest run test/widget.test.mjs",
		]);
		assert.equal(Array.isArray(brief.repro_skipped), true);
		assert.equal(brief.repro_skipped.length, 1);
		await rm(root, { recursive: true, force: true });
	});
});
