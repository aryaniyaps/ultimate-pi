import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { describe, test } from "node:test";
import {
	claimRunOwnership,
	nextStepAfterOutcome,
	parseHarnessUseRunArgs,
	policyBootstrapFromRunContext,
	resolveCompletionStatuses,
} from "../.pi/lib/harness-run-context.ts";
import { writeYamlFile } from "../.pi/lib/harness-yaml.ts";

describe("parseHarnessUseRunArgs", () => {
	test("parses run id and flags", () => {
		const parsed = parseHarnessUseRunArgs(
			"--claim --readonly 019e5345-b9d3-784b-ab45-a6ffcbdd0a41-1779513618959",
		);
		assert.equal(
			parsed.runId,
			"019e5345-b9d3-784b-ab45-a6ffcbdd0a41-1779513618959",
		);
		assert.equal(parsed.claim, true);
		assert.equal(parsed.readonly, true);
	});
});

describe("claimRunOwnership", () => {
	test("sets owner and pi session to current session", () => {
		const ctx = claimRunOwnership(
			{
				schema_version: "1.0.0",
				run_id: "run-a",
				pi_session_id: "old",
				project_root: "/tmp",
				phase: "evaluate",
				plan_id: "plan-a",
				plan_packet_path: null,
				plan_ready: true,
				task_summary: null,
				status: "active",
				last_completed_step: "execute",
				last_outcome: "completed",
				next_recommended_command: null,
				owner_pi_session_id: "old-owner",
				updated_at: "2026-01-01T00:00:00.000Z",
			},
			"new-session",
		);
		assert.equal(ctx.owner_pi_session_id, "new-session");
		assert.equal(ctx.pi_session_id, "new-session");
	});
});

describe("nextStepAfterOutcome post-run", () => {
	test("after execute suggests harness-review master command", () => {
		assert.equal(
			nextStepAfterOutcome({
				phase: "evaluate",
				executionStatus: "completed",
			}),
			"/harness-review",
		);
	});

	test("eval fail after review with implementation_gap suggests steer", () => {
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

	test("adversary complete suggests policy status", () => {
		assert.equal(
			nextStepAfterOutcome({
				phase: "evaluate",
				evalStatus: "pass",
				adversaryComplete: true,
			}),
			"/harness-policy-status",
		);
	});
});

describe("resolveCompletionStatuses", () => {
	test("reads eval-verdict.yaml from run dir", async () => {
		const root = await mkdtemp(join(tmpdir(), "harness-postrun-"));
		const runId = "run-test-1";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "artifacts"), { recursive: true });
		await writeYamlFile(join(runDir, "artifacts", "eval-verdict.yaml"), {
			schema_version: "1.0.0",
			contract_version: "1.0.0",
			run_id: runId,
			status: "fail",
			failed_checks: ["AC-01"],
			regression_flags: [],
			confidence: 0.5,
			recommended_action: "replan",
		});
		const statuses = await resolveCompletionStatuses([], runId, root);
		assert.equal(statuses.evalStatus, "fail");
		assert.equal(statuses.adversaryComplete, false);
		await rm(root, { recursive: true, force: true });
	});
});

describe("policyBootstrapFromRunContext", () => {
	test("executor subprocess gets approved plan from disk context", () => {
		const prev = process.env.HARNESS_AGENT_ID;
		process.env.HARNESS_AGENT_ID = "harness/running/executor";
		const boot = policyBootstrapFromRunContext({
			schema_version: "1.0.0",
			run_id: "run-x",
			pi_session_id: "",
			project_root: "/tmp",
			phase: "execute",
			plan_id: "plan-x",
			plan_packet_path: "/tmp/plan-packet.yaml",
			plan_ready: true,
			task_summary: null,
			status: "active",
			last_completed_step: null,
			last_outcome: null,
			next_recommended_command: null,
			owner_pi_session_id: "owner",
			updated_at: "2026-01-01T00:00:00.000Z",
		});
		assert.equal(boot.approvedPlan, true);
		assert.equal(boot.phase, "execute");
		if (prev === undefined) delete process.env.HARNESS_AGENT_ID;
		else process.env.HARNESS_AGENT_ID = prev;
	});
});
