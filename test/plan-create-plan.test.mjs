import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { canonicalPlanPath } from "../.pi/lib/harness-run-context.ts";
import { executeCreatePlan } from "../.pi/extensions/lib/plan-approval/create-plan.ts";

const samplePacket = {
	schema_version: "1.0.0",
	contract_version: "1.0.0",
	plan_id: "plan-create-001",
	task_id: "task-001",
	scope: "Test create_plan tool",
	assumptions: [],
	risk_level: "low",
	acceptance_checks: ["plan file exists"],
	rollback_plan: {
		revert_commit_ready: true,
		rollback_artifacts: {
			revert_command: "git revert HEAD",
			revert_branch: "main",
			patch_bundle: "/tmp/p.patch",
		},
	},
};

test("executeCreatePlan writes canonical plan-packet.yaml after approval", async () => {
	const root = await mkdtemp(join(tmpdir(), "harness-create-plan-"));
	const runId = "run-create-001";
	const planPath = `.pi/harness/runs/${runId}/plan-packet.yaml`;
	const planAbs = canonicalPlanPath(runId, root);
	const parentEntries = [
		{
			type: "custom",
			customType: "harness-plan-approval",
			data: {
				plan_id: "plan-create-001",
				approved_at: new Date().toISOString(),
				source: "approve_plan",
			},
		},
	];
	const runCtx = {
		schema_version: "1.0.0",
		run_id: runId,
		pi_session_id: "sess-1",
		project_root: root,
		phase: "plan",
		plan_id: "plan-create-001",
		plan_packet_path: planPath,
		plan_ready: false,
		task_summary: "test",
		status: "active",
		last_completed_step: null,
		last_outcome: null,
		next_recommended_command: null,
		owner_pi_session_id: "sess-1",
		updated_at: new Date().toISOString(),
	};
	let committed = false;
	const result = await executeCreatePlan(samplePacket, {
		projectRoot: root,
		getParentEntries: () => parentEntries,
		getSubagentEntries: () => [],
		getParentRunContext: () => runCtx,
		onCommitted: () => {
			committed = true;
		},
	});
	assert.equal(result.ok, true);
	assert.equal(committed, true);
	const raw = await readFile(planAbs, "utf-8");
	const parsed = parseYaml(raw);
	assert.equal(parsed.plan_id, "plan-create-001");
});

test("executeCreatePlan rejects without approval", async () => {
	const root = await mkdtemp(join(tmpdir(), "harness-create-plan-"));
	const runId = "run-create-002";
	const planPath = `.pi/harness/runs/${runId}/plan-packet.yaml`;
	const runCtx = {
		schema_version: "1.0.0",
		run_id: runId,
		pi_session_id: "sess-1",
		project_root: root,
		phase: "plan",
		plan_id: null,
		plan_packet_path: planPath,
		plan_ready: false,
		task_summary: "test",
		status: "active",
		last_completed_step: null,
		last_outcome: null,
		next_recommended_command: null,
		owner_pi_session_id: "sess-1",
		updated_at: new Date().toISOString(),
	};
	const result = await executeCreatePlan(samplePacket, {
		projectRoot: root,
		getParentEntries: () => [],
		getSubagentEntries: () => [],
		getParentRunContext: () => runCtx,
		onCommitted: () => {},
	});
	assert.equal(result.ok, false);
});
