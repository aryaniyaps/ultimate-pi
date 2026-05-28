import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	EVALUATE_PHASE_ORCHESTRATOR_ARTIFACTS,
	isEvaluatePhaseOrchestratorArtifactRel,
	isPlanPhaseAllowedMutation,
	isPlanPhaseScopedWrite,
	resolveHarnessRunWriteTarget,
} from "../.pi/lib/harness-run-context.ts";
import { evaluateHarnessToolPolicy } from "../.pi/lib/agt/evaluate-policy.ts";
import { dirname, join as joinPath } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = joinPath(dirname(fileURLToPath(import.meta.url)), "..");

function runCtx(runId, projectRoot, phase = "plan") {
	return {
		schema_version: "1.0.0",
		run_id: runId,
		pi_session_id: "sess-1",
		project_root: projectRoot,
		phase,
		plan_id: "plan-001",
		plan_packet_path: join(
			projectRoot,
			".pi/harness/runs",
			runId,
			"plan-packet.yaml",
		),
		plan_ready: phase !== "plan",
		task_summary: "test task",
		status: "active",
		last_completed_step: null,
		last_outcome: null,
		next_recommended_command: null,
		owner_pi_session_id: "sess-1",
		updated_at: new Date().toISOString(),
	};
}

function harnessEntries() {
	return [
		{
			type: "message",
			message: { role: "user", content: "/harness-auto" },
		},
	];
}

async function assertWritePhase(
	phase,
	relPath,
	expectAllowed,
	projectRoot,
	runId,
) {
	const ctx = runCtx(runId, projectRoot, phase);
	const abs = join(projectRoot, ".pi/harness/runs", runId, relPath);
	await mkdir(join(projectRoot, ".pi/harness/runs", runId, "artifacts"), {
		recursive: true,
	});
	const decision = await isPlanPhaseAllowedMutation(
		"write",
		{ path: abs },
		phase,
		ctx,
		projectRoot,
		{
			aborted: false,
			entries: harnessEntries(),
			currentSessionId: "sess-1",
		},
	);
	assert.equal(
		decision.allowed,
		expectAllowed,
		`${phase} write ${relPath}: expected ${expectAllowed}, got ${decision.allowed} (${decision.reason ?? ""})`,
	);
}

test("evaluate orchestrator artifact set covers harness-review parent writes", () => {
	for (const name of [
		"benchmark-log.yaml",
		"sentrux-signal.yaml",
		"ls-lint-signal.yaml",
		"sentrux-repair-plan.yaml",
		"review-outcome.yaml",
		"repair-brief.yaml",
	]) {
		assert.ok(
			EVALUATE_PHASE_ORCHESTRATOR_ARTIFACTS.has(name),
			`missing ${name}`,
		);
		assert.ok(
			isEvaluatePhaseOrchestratorArtifactRel(`artifacts/${name}`),
			`rel check ${name}`,
		);
	}
});

test("phase matrix: plan allows run artifacts, blocks src", async () => {
	const root = await mkdtemp(join(tmpdir(), "harness-phase-matrix-"));
	const runId = "run-plan";
	await assertWritePhase("plan", "artifacts/decomposition.yaml", true, root, runId);
	await assertWritePhase(
		"plan",
		"artifacts/hypothesis-validation-r1.yaml",
		true,
		root,
		runId,
	);
	await assertWritePhase("plan", "src/app.ts", false, root, runId);
});

test("phase matrix: evaluate allows review orchestrator yaml, blocks plan edits to src", async () => {
	const root = await mkdtemp(join(tmpdir(), "harness-phase-matrix-"));
	const runId = "run-eval";
	for (const file of [
		"benchmark-log.yaml",
		"sentrux-signal.yaml",
		"sentrux-repair-plan.yaml",
		"review-outcome.yaml",
	]) {
		await assertWritePhase("evaluate", `artifacts/${file}`, true, root, runId);
	}
	await assertWritePhase("evaluate", "src/app.ts", false, root, runId);
	await assertWritePhase(
		"evaluate",
		"artifacts/decomposition.yaml",
		false,
		root,
		runId,
	);
});

test("phase matrix: execute allows src and run artifacts", async () => {
	const root = await mkdtemp(join(tmpdir(), "harness-phase-matrix-"));
	const runId = "run-exec";
	await assertWritePhase("execute", "src/app.ts", true, root, runId);
	await assertWritePhase(
		"execute",
		"artifacts/sentrux-signal.yaml",
		true,
		root,
		runId,
	);
});

test("resolveHarnessRunWriteTarget + scoped write in evaluate phase", async () => {
	const root = await mkdtemp(join(tmpdir(), "harness-phase-matrix-"));
	const runId = "run-resolve";
	const ctx = runCtx(runId, root, "evaluate");
	const target = resolveHarnessRunWriteTarget(
		"artifacts/sentrux-repair-plan.yaml",
		ctx,
		root,
	);
	assert.ok(target);
	assert.equal(
		await isPlanPhaseScopedWrite(target.absPath, ctx, root),
		true,
	);
	const decision = await isPlanPhaseAllowedMutation(
		"write",
		{ path: target.absPath },
		"evaluate",
		ctx,
		root,
		{
			aborted: false,
			entries: harnessEntries(),
			currentSessionId: "sess-1",
		},
	);
	assert.equal(decision.allowed, true);
});

test("AGT: parent orchestrator debate + approval tools allowed in plan phase", async () => {
	const projectRoot = await mkdtemp(join(tmpdir(), "harness-phase-matrix-agt-"));
	const prev = process.env.HARNESS_AGT_POLICY;
	process.env.HARNESS_AGT_POLICY = "1";
	try {
		for (const toolName of [
			"harness_debate_open",
			"harness_debate_round_status",
			"approve_plan",
			"write_harness_yaml",
			"subagent",
		]) {
			const result = await evaluateHarnessToolPolicy(pkgRoot, {
				toolName,
				toolInput:
					toolName === "subagent"
						? {
								agent: "harness/planning/hypothesis-validator",
								task: "validate",
							}
						: {},
				packageRoot: pkgRoot,
				projectRoot,
				sessionId: "sess-plan",
				entries: harnessEntries(),
				policyState: {
					phase: "plan",
					approvedPlan: false,
					planId: null,
					aborted: false,
					budgetBypass: false,
				},
			});
			assert.equal(
				result.allowed,
				true,
				`${toolName} should be allowed in plan: ${result.reason}`,
			);
		}
	} finally {
		process.env.HARNESS_AGT_POLICY = prev;
	}
});
