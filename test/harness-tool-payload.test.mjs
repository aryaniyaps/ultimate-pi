import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolveApprovePlanParamsFromDisk } from "../.pi/extensions/lib/plan-approval/resolve-disk.ts";
import { synthesizeRepairBrief } from "../.pi/lib/harness-repair-brief.ts";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
	isEvaluatePhaseOrchestratorArtifact,
	nextStepAfterOutcome,
} from "../.pi/lib/harness-run-context.ts";

describe("evaluate phase orchestrator artifacts", () => {
	test("allows review-outcome path", () => {
		assert.equal(
			isEvaluatePhaseOrchestratorArtifact("run-1/artifacts/review-outcome.yaml"),
			true,
		);
	});
});

describe("nextStepAfterOutcome steer routing", () => {
	test("blocked execute suggests review not replan", () => {
		assert.equal(
			nextStepAfterOutcome({
				phase: "evaluate",
				executionStatus: "blocked",
			}),
			"/harness-review",
		);
	});

	test("implementation_gap after review suggests steer", () => {
		assert.equal(
			nextStepAfterOutcome({
				phase: "evaluate",
				evalStatus: "fail",
				lastCompletedStep: "review",
				remediationClass: "implementation_gap",
				steerAttempt: 0,
				steerMaxAttempts: 3,
				reviewComplete: true,
			}),
			"/harness-steer",
		);
	});
});

describe("resolveApprovePlanParamsFromDisk", () => {
	test("errors without run context", async () => {
		const r = await resolveApprovePlanParamsFromDisk({}, [], "/tmp");
		assert.equal(r.ok, false);
	});
});

describe("synthesizeRepairBrief", () => {
	test("builds brief from review-outcome on disk", async () => {
		const root = join(tmpdir(), `repair-brief-${randomUUID()}`);
		const runId = "run-synth";
		const art = join(root, ".pi", "harness", "runs", runId, "artifacts");
		await mkdir(art, { recursive: true });
		await writeFile(
			join(art, "review-outcome.yaml"),
			[
				"schema_version: 1.0.0",
				"run_id: run-synth",
				"status: fail",
				"remediation_class: implementation_gap",
				"recommended_next: /harness-steer",
				"failed_acceptance_check_ids:",
				"  - ac-1",
			].join("\n"),
			"utf-8",
		);
		const brief = await synthesizeRepairBrief({
			runId,
			projectRoot: root,
			steerAttempt: 1,
		});
		assert.equal(brief.run_id, runId);
		assert.equal(brief.steer_attempt, 1);
		assert.equal(brief.remediation_class, "implementation_gap");
		assert.deepEqual(brief.failed_acceptance_check_ids, ["ac-1"]);
		assert.ok(Array.isArray(brief.fix_directives));
		assert.ok(brief.fix_directives.length >= 1);
	});
});
