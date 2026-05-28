import assert from "node:assert/strict";
import { mkdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { describe, test } from "node:test";
import {
	buildHarnessClearManifest,
	claimRunOwnership,
	nextStepAfterOutcome,
	parseHarnessUseRunArgs,
	policyBootstrapFromRunContext,
	resolveCompletionStatuses,
	blockingHarnessAutoCommandReason,
	blockingReviewCommandReason,
	blockingRunCommandReason,
	blockingSteerCommandReason,
	harnessAutoTasksDiffer,
	resetRunContextForHarnessAuto,
	shouldReuseHarnessRunId,
	shouldReuseHarnessRunIdForAuto,
	isHarnessAutoSession,
	ensureReviewOutcomeFromEval,
	remediationClassFromEvalVerdict,
	reconcileReviewRouting,
	reconcileStaleExecuteCompletion,
	refreshRunContextProgress,
	resolveArgsForCommand,
	resolveHarnessRunPostAgentState,
	syncPlanLastOutcomeFromTaskClarification,
	syncPlanReadyFromDisk,
} from "../.pi/lib/harness-run-context.ts";
import {
	armHarnessKillSwitch,
	disarmHarnessKillSwitch,
	isHarnessKillSwitchDisarmed,
} from "../.pi/lib/agt/kill-switch-state.ts";
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


describe("buildHarnessClearManifest", () => {
	test("limits candidates to in-root historical run directories", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-clear-manifest-"));
		const runsRoot = join(root, ".pi", "harness", "runs");
		await mkdir(runsRoot, { recursive: true });
		await mkdir(join(runsRoot, "run-a"), { recursive: true });
		await mkdir(join(runsRoot, "run-b"), { recursive: true });
		const outside = join(root, "outside-run");
		await mkdir(outside, { recursive: true });
		await symlink(outside, join(runsRoot, "escape-run"));
		const manifest = await buildHarnessClearManifest(root, ["run-b"]);
		assert.deepEqual(
			manifest.candidates.map((candidate) => candidate.run_id),
			["run-a"],
		);
		assert.equal(manifest.protected_run_ids.includes("run-b"), true);
		assert.equal(
			manifest.skipped.some(
				(item) =>
					item.run_id === "escape-run" && item.reason === "out_of_root",
			),
			true,
		);
		await rm(root, { recursive: true, force: true });
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

describe("syncPlanLastOutcomeFromTaskClarification", () => {
	test("clears stale needs_clarification when task-clarification is ready", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-sync-outcome-"));
		const runId = "run-sync-test";
		const runDir = join(root, ".pi", "harness", "runs", runId, "artifacts");
		await mkdir(runDir, { recursive: true });
		await writeFile(
			join(runDir, "task-clarification.yaml"),
			`schema_version: 1.0.0
status: ready
clarified_task: Add harness-clear command
unresolved_questions: []
`,
			"utf-8",
		);
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "plan",
			plan_id: "plan-x",
			plan_packet_path: join(root, ".pi/harness/runs", runId, "plan-packet.yaml"),
			plan_ready: false,
			task_summary: "harness-clear",
			status: "active",
			last_completed_step: "plan",
			last_outcome: "needs_clarification",
			next_recommended_command: "/harness-run-status",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const synced = await syncPlanLastOutcomeFromTaskClarification(root, ctx);
		assert.equal(synced.last_outcome, null);
		assert.equal(synced.next_recommended_command, "/harness-run-status");
		await rm(root, { recursive: true, force: true });
	});
});

describe("reconcileStaleExecuteCompletion", () => {
	test("resets false completed when executor handoff is missing", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-reconcile-exec-"));
		const runId = "run-stale-exec";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "artifacts"), { recursive: true });
		await writeYamlFile(join(runDir, "plan-packet.yaml"), {
			schema_version: "1.0.0",
			contract_version: "1.1.0",
			plan_id: "plan-harness-clear",
			task_id: "task-harness-clear",
			scope: "Add harness-clear prompt",
			acceptance_checks: ["prompt exists"],
			risk_level: "med",
			rollback_plan: "revert commit",
			execution_plan: { work_items: [{ id: "WI-01", title: "t" }] },
		});
		await writeFile(
			join(runDir, "plan-review.md"),
			"# Harness plan\n\n- **Status:** committed\n",
			"utf-8",
		);
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "evaluate",
			plan_id: "plan-harness-clear",
			plan_packet_path: join(runDir, "plan-packet.yaml"),
			plan_ready: true,
			task_summary: "harness-clear",
			status: "active",
			last_completed_step: "execute",
			last_outcome: "completed",
			next_recommended_command: "/harness-review",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const reconciled = await reconcileStaleExecuteCompletion(root, ctx, []);
		assert.equal(reconciled.phase, "plan");
		assert.equal(reconciled.last_outcome, "ready");
		assert.equal(reconciled.next_recommended_command, "/harness-run");
		await rm(root, { recursive: true, force: true });
	});

	test("promotes stale plan-phase context when executor handoff is completed", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-reconcile-handoff-"));
		const runId = "run-handoff-ahead";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "handoff"), { recursive: true });
		await writeYamlFile(join(runDir, "plan-packet.yaml"), {
			schema_version: "1.0.0",
			contract_version: "1.1.0",
			plan_id: "plan-harness-clear",
			task_id: "task-harness-clear",
			scope: "Add harness-clear prompt",
			acceptance_checks: ["prompt exists"],
			risk_level: "med",
			rollback_plan: "revert commit",
			execution_plan: { work_items: [{ id: "WI-01", title: "t" }] },
		});
		await writeFile(
			join(runDir, "plan-review.md"),
			"# Harness plan\n\n- **Status:** committed\n",
			"utf-8",
		);
		await writeYamlFile(join(runDir, "handoff", "executor-summary.yaml"), {
			schema_version: "1.0.0",
			execution_status: "completed",
			handoff_ready: { ready: true },
		});
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "execute",
			plan_id: "plan-harness-clear",
			plan_packet_path: join(runDir, "plan-packet.yaml"),
			plan_ready: true,
			task_summary: "harness-clear",
			status: "active",
			last_completed_step: "plan",
			last_outcome: "ready",
			next_recommended_command: "/harness-run-status",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const reconciled = await reconcileStaleExecuteCompletion(root, ctx, []);
		assert.equal(reconciled.last_completed_step, "execute");
		assert.equal(reconciled.last_outcome, "completed");
		assert.equal(reconciled.phase, "evaluate");
		assert.equal(reconciled.next_recommended_command, "/harness-review");
		await rm(root, { recursive: true, force: true });
	});
});

describe("refreshRunContextProgress", () => {
	test("recomputes next command from executor handoff while context lags", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-refresh-progress-"));
		const runId = "run-refresh-progress";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "handoff"), { recursive: true });
		await writeYamlFile(join(runDir, "handoff", "executor-summary.yaml"), {
			schema_version: "1.0.0",
			execution_status: "completed",
		});
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "plan",
			plan_id: "p",
			plan_packet_path: null,
			plan_ready: true,
			task_summary: "t",
			status: "active",
			last_completed_step: "plan",
			last_outcome: "ready",
			next_recommended_command: "/harness-run-status",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const refreshed = await refreshRunContextProgress(root, ctx, []);
		assert.equal(refreshed.phase, "evaluate");
		assert.equal(refreshed.last_completed_step, "execute");
		assert.equal(refreshed.next_recommended_command, "/harness-review");
		await rm(root, { recursive: true, force: true });
	});
});

describe("resolveHarnessRunPostAgentState", () => {
	test("does not default to completed without executor status", () => {
		const state = resolveHarnessRunPostAgentState(null, true);
		assert.equal(state.last_completed_step, "plan");
		assert.equal(state.last_outcome, "ready");
		assert.equal(state.phase, "plan");
		assert.equal(state.next_recommended_command, "/harness-run");
	});

	test("moves to evaluate when executor completed", () => {
		const state = resolveHarnessRunPostAgentState("completed", true);
		assert.equal(state.last_completed_step, "execute");
		assert.equal(state.last_outcome, "completed");
		assert.equal(state.phase, "evaluate");
		assert.equal(state.next_recommended_command, "/harness-review");
	});
});

describe("harness-auto pipeline routing", () => {
	test("does not reuse run id after execute started", () => {
		const ctx = {
			schema_version: "1.0.0",
			run_id: "run-auto",
			pi_session_id: "sess",
			project_root: "/tmp",
			phase: "evaluate",
			plan_id: "p",
			plan_packet_path: null,
			plan_ready: true,
			task_summary: "smoke task",
			status: "active",
			last_completed_step: "review",
			last_outcome: "fail",
			next_recommended_command: null,
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		assert.equal(shouldReuseHarnessRunIdForAuto(ctx), false);
		assert.equal(
			shouldReuseHarnessRunId("", ctx, "harness-auto"),
			false,
		);
	});

	test("disarmHarnessKillSwitch clears kill-switch block for session", () => {
		const sid = "sess-kill-disarm";
		armHarnessKillSwitch(sid);
		assert.equal(isHarnessKillSwitchDisarmed(sid), false);
		disarmHarnessKillSwitch(sid);
		assert.equal(isHarnessKillSwitchDisarmed(sid), true);
	});

	test("resolveArgsForCommand does not inherit stale plan_packet_path", () => {
		const resolved = resolveArgsForCommand(
			"harness-auto",
			'"smoke task" --quick',
			{
				run_id: "run-new",
				plan_packet_path: "/tmp/old-run/plan-packet.yaml",
			},
		);
		assert.equal(resolved.planPath, null);
		const withPlan = resolveArgsForCommand(
			"harness-auto",
			"--plan /tmp/run-new/plan-packet.yaml",
			{ run_id: "run-new" },
		);
		assert.equal(withPlan.planPath, "/tmp/run-new/plan-packet.yaml");
	});

	test("resetRunContextForHarnessAuto clears post-plan progress", () => {
		const reset = resetRunContextForHarnessAuto({
			schema_version: "1.0.0",
			run_id: "run-auto",
			pi_session_id: "sess",
			project_root: "/tmp",
			phase: "evaluate",
			plan_id: "p",
			plan_packet_path: "/tmp/plan.yaml",
			plan_ready: true,
			task_summary: "smoke",
			status: "active",
			last_completed_step: "review",
			last_outcome: "fail",
			next_recommended_command: "/harness-steer",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
			steer_attempt: 2,
		});
		assert.equal(reset.phase, "plan");
		assert.equal(reset.plan_ready, false);
		assert.equal(reset.last_completed_step, null);
		assert.equal(reset.steer_attempt, 0);
	});

	test("blocks harness-auto with missing task", async () => {
		const reason = await blockingHarnessAutoCommandReason(
			"harness-auto",
			null,
			"--quick",
			"/harness-auto --quick",
		);
		assert.match(reason ?? "", /Usage: \/harness-auto/i);
	});

	test("blocks harness-auto when task differs from active run", async () => {
		const reason = await blockingHarnessAutoCommandReason(
			"harness-auto",
			{
				schema_version: "1.0.0",
				run_id: "run-a",
				pi_session_id: "sess",
				project_root: "/tmp",
				phase: "plan",
				plan_id: null,
				plan_packet_path: null,
				plan_ready: false,
				task_summary: "harness-clear",
				status: "active",
				last_completed_step: null,
				last_outcome: null,
				next_recommended_command: null,
				owner_pi_session_id: "sess",
				updated_at: "2026-01-01T00:00:00.000Z",
			},
			'"other task"',
			'/harness-auto "other task"',
		);
		assert.match(reason ?? "", /different task/i);
	});

	test("blockingRunCommandReason bypassed during harness-auto session", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-auto-bypass-"));
		const runId = "run-auto-bypass";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "handoff"), { recursive: true });
		await writeYamlFile(join(runDir, "handoff", "executor-summary.yaml"), {
			execution_status: "completed",
		});
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "evaluate",
			plan_id: "p",
			plan_packet_path: null,
			plan_ready: true,
			task_summary: "t",
			status: "active",
			last_completed_step: "execute",
			last_outcome: "completed",
			next_recommended_command: "/harness-review",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const entries = [
			{
				type: "custom",
				customType: "harness-turn",
				data: {
					command: "harness-auto",
					args: '"t"',
					invoked_at: "2026-01-01T00:00:00.000Z",
				},
			},
		];
		assert.equal(isHarnessAutoSession(entries), true);
		const reason = await blockingRunCommandReason(
			"harness-run",
			ctx,
			root,
			entries,
		);
		assert.equal(reason, null);
		await rm(root, { recursive: true, force: true });
	});
});

describe("review routing from eval-verdict", () => {
	test("replan maps to plan_gap", () => {
		assert.equal(
			remediationClassFromEvalVerdict({
				status: "fail",
				recommended_action: "replan",
			}),
			"plan_gap",
		);
	});

	test("synthesizes review-outcome and routes to plan revise", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-review-sync-"));
		const runId = "run-review-sync";
		const runDir = join(root, ".pi", "harness", "runs", runId, "artifacts");
		await mkdir(runDir, { recursive: true });
		await writeYamlFile(join(runDir, "eval-verdict.yaml"), {
			schema_version: "1.0.0",
			contract_version: "1.0.0",
			run_id: runId,
			status: "fail",
			recommended_action: "replan",
			failed_checks: ["scope_minimization_not_met"],
		});
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "evaluate",
			plan_id: "p",
			plan_packet_path: null,
			plan_ready: true,
			task_summary: "t",
			status: "active",
			last_completed_step: "review",
			last_outcome: "fail",
			next_recommended_command: "/harness-steer",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		await ensureReviewOutcomeFromEval(runId, root);
		const routed = await reconcileReviewRouting(root, ctx);
		assert.equal(routed.next_recommended_command, "/harness-plan (mode: revise)");
		const steerBlock = await blockingSteerCommandReason(
			"harness-steer",
			routed,
			root,
		);
		assert.match(steerBlock ?? "", /implementation_gap/i);
		await rm(root, { recursive: true, force: true });
	});
});

describe("harness command gates", () => {
	test("blocks harness-run when executor handoff completed", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-gate-run-"));
		const runId = "run-gate-run";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "handoff"), { recursive: true });
		await writeYamlFile(join(runDir, "handoff", "executor-summary.yaml"), {
			schema_version: "1.0.0",
			execution_status: "completed",
		});
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "plan",
			plan_id: "p",
			plan_packet_path: join(runDir, "plan-packet.yaml"),
			plan_ready: true,
			task_summary: "t",
			status: "active",
			last_completed_step: "plan",
			last_outcome: "ready",
			next_recommended_command: "/harness-run",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const reason = await blockingRunCommandReason("harness-run", ctx, root);
		assert.match(reason ?? "", /already completed/i);
		await rm(root, { recursive: true, force: true });
	});

	test("blocks harness-review without execute handoff", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-gate-review-"));
		const runId = "run-gate-review";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(runDir, { recursive: true });
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "plan",
			plan_id: "p",
			plan_packet_path: null,
			plan_ready: true,
			task_summary: "t",
			status: "active",
			last_completed_step: "plan",
			last_outcome: "ready",
			next_recommended_command: "/harness-run",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const reason = await blockingReviewCommandReason(
			"harness-review",
			ctx,
			root,
		);
		assert.match(reason ?? "", /Execute not finished/i);
		await rm(root, { recursive: true, force: true });
	});

	test("blocks harness-steer without review-outcome", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-gate-steer-"));
		const runId = "run-gate-steer";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "handoff"), { recursive: true });
		await writeYamlFile(join(runDir, "handoff", "executor-summary.yaml"), {
			execution_status: "completed",
		});
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "evaluate",
			plan_id: "p",
			plan_packet_path: null,
			plan_ready: true,
			task_summary: "t",
			status: "active",
			last_completed_step: "execute",
			last_outcome: "completed",
			next_recommended_command: "/harness-review",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const reason = await blockingSteerCommandReason("harness-steer", ctx, root);
		assert.match(reason ?? "", /harness-review first/i);
		await rm(root, { recursive: true, force: true });
	});
});

describe("syncPlanReadyFromDisk", () => {
	test("sets plan_ready when plan-review.md is committed", async () => {
		const root = await mkdtemp(join(tmpdir(), "up-sync-ready-"));
		const runId = "run-ready-sync";
		const runDir = join(root, ".pi", "harness", "runs", runId);
		await mkdir(join(runDir, "artifacts"), { recursive: true });
		await writeYamlFile(join(runDir, "plan-packet.yaml"), {
			schema_version: "1.0.0",
			contract_version: "1.1.0",
			plan_id: "plan-harness-clear",
			task_id: "task-harness-clear",
			scope: "Add harness-clear prompt",
			acceptance_checks: ["prompt exists"],
			risk_level: "med",
			rollback_plan: "revert commit",
			execution_plan: { work_items: [{ id: "WI-01", title: "t" }] },
		});
		await writeFile(
			join(runDir, "plan-review.md"),
			"# Harness plan\n\n- **Status:** committed\n",
			"utf-8",
		);
		const ctx = {
			schema_version: "1.0.0",
			run_id: runId,
			pi_session_id: "sess",
			project_root: root,
			phase: "plan",
			plan_id: null,
			plan_packet_path: join(runDir, "plan-packet.yaml"),
			plan_ready: false,
			task_summary: "harness-clear",
			status: "active",
			last_completed_step: "plan",
			last_outcome: null,
			next_recommended_command: "/harness-run-status",
			owner_pi_session_id: "sess",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const synced = await syncPlanReadyFromDisk(root, ctx, []);
		assert.equal(synced.plan_ready, true);
		assert.equal(synced.last_outcome, "ready");
		assert.equal(synced.next_recommended_command, "/harness-run");
		await rm(root, { recursive: true, force: true });
	});
});
