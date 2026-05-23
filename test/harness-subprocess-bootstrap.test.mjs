import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stringify as yamlStringify } from "yaml";
import {
	canonicalPlanPath,
	isHarnessSubprocess,
	isPlanPhaseAllowedMutation,
	loadRunContextForSubprocess,
	policyBootstrapFromRunContext,
} from "../.pi/lib/harness-run-context.ts";

test("loadRunContextForSubprocess reads run-context.yaml when env set", async () => {
	const root = await mkdtemp(join(tmpdir(), "harness-subproc-"));
	const runId = "run-sub-001";
	const runDir = join(root, ".pi/harness/runs", runId);
	await mkdir(runDir, { recursive: true });
	const planPath = canonicalPlanPath(runId, root);
	const ctx = {
		schema_version: "1.0.0",
		run_id: runId,
		pi_session_id: "parent-sess",
		project_root: root,
		phase: "execute",
		plan_id: "plan-sub-001",
		plan_packet_path: planPath,
		plan_ready: true,
		task_summary: "kb updater",
		status: "active",
		last_completed_step: "plan",
		last_outcome: "ready",
		next_recommended_command: "/harness-run",
		owner_pi_session_id: "parent-sess",
		updated_at: new Date().toISOString(),
	};
	await writeFile(join(runDir, "run-context.yaml"), yamlStringify(ctx), "utf-8");

	const prevSub = process.env.PI_HARNESS_SUBPROCESS;
	const prevRun = process.env.HARNESS_RUN_ID;
	const prevAgent = process.env.HARNESS_AGENT_ID;
	process.env.PI_HARNESS_SUBPROCESS = "1";
	process.env.HARNESS_RUN_ID = runId;
	process.env.HARNESS_AGENT_ID = "harness/executor";
	try {
		assert.equal(isHarnessSubprocess(), true);
		const loaded = await loadRunContextForSubprocess(root);
		assert.ok(loaded);
		assert.equal(loaded.plan_ready, true);
		assert.equal(loaded.run_id, runId);
		const boot = policyBootstrapFromRunContext(loaded);
		assert.equal(boot.phase, "execute");
		assert.equal(boot.approvedPlan, true);

		const allowed = await isPlanPhaseAllowedMutation(
			"write",
			{ path: join(root, "scripts/new.py") },
			"execute",
			loaded,
			root,
			{
				aborted: false,
				entries: [],
				currentSessionId: "child-sess",
			},
		);
		assert.equal(allowed.allowed, true);
	} finally {
		if (prevSub !== undefined) process.env.PI_HARNESS_SUBPROCESS = prevSub;
		else delete process.env.PI_HARNESS_SUBPROCESS;
		if (prevRun !== undefined) process.env.HARNESS_RUN_ID = prevRun;
		else delete process.env.HARNESS_RUN_ID;
		if (prevAgent !== undefined) process.env.HARNESS_AGENT_ID = prevAgent;
		else delete process.env.HARNESS_AGENT_ID;
	}
});
