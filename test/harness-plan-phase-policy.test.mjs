import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	canonicalPlanPath,
	hasPlanUserApproval,
	indexOfLastPlanCommand,
	isCanonicalPlanPacketPath,
	isPlanPhaseAllowedMutation,
	isPlanPhaseScopedWrite,
	normalizeHarnessPath,
	parseAskUserApprovalFromMessage,
	validatePlanOverridePath,
} from "../.pi/lib/harness-run-context.ts";

function runCtx(runId, projectRoot) {
	return {
		schema_version: "1.0.0",
		run_id: runId,
		pi_session_id: "sess-1",
		project_root: projectRoot,
		phase: "plan",
		plan_id: "plan-001",
		plan_packet_path: canonicalPlanPath(runId, projectRoot),
		plan_ready: false,
		task_summary: "test task",
		status: "active",
		last_completed_step: null,
		last_outcome: null,
		next_recommended_command: null,
		owner_pi_session_id: "sess-1",
		updated_at: new Date().toISOString(),
	};
}

test("isCanonicalPlanPacketPath accepts only plan-packet.yaml", () => {
	const root = "/proj";
	const runId = "run-abc";
	const ok = canonicalPlanPath(runId, root);
	assert.equal(isCanonicalPlanPacketPath(ok, root, runId), true);
	assert.equal(
		isCanonicalPlanPacketPath(join(root, ".pi/harness/runs", runId, "other.json"), root, runId),
		false,
	);
});

test("validatePlanOverridePath rejects non-canonical files under run dir", () => {
	const root = "/proj";
	const runId = "run-abc";
	const bad = join(root, ".pi/harness/runs", runId, "evil.json");
	const check = validatePlanOverridePath(bad, runId, root);
	assert.equal(check.ok, false);
	const good = canonicalPlanPath(runId, root);
	assert.equal(validatePlanOverridePath(good, runId, root).ok, true);
});

test("isPlanPhaseScopedWrite allows canonical plan path only", async () => {
	const root = await mkdtemp(join(tmpdir(), "harness-plan-"));
	const runId = "run-001";
	const ctx = runCtx(runId, root);
	const planPath = canonicalPlanPath(runId, root);
	await mkdir(join(root, ".pi/harness/runs", runId), { recursive: true });
	assert.equal(await isPlanPhaseScopedWrite(planPath, ctx, root), true);
	assert.equal(
		await isPlanPhaseScopedWrite(join(root, "src/app.ts"), ctx, root),
		false,
	);
});

test("isPlanPhaseAllowedMutation allows draft plan yaml without approval", async () => {
	const root = await mkdtemp(join(tmpdir(), "harness-plan-"));
	const runId = "run-002";
	const ctx = runCtx(runId, root);
	const planPath = canonicalPlanPath(runId, root);
	await mkdir(join(root, ".pi/harness/runs", runId), { recursive: true });
	const entries = [
		{
			type: "custom",
			customType: "harness-plan-attempt",
			data: { run_id: runId, command: "harness-plan" },
		},
	];
	const draft = await isPlanPhaseAllowedMutation(
		"write",
		{ path: planPath },
		"plan",
		ctx,
		root,
		{ aborted: false, entries, currentSessionId: "sess-1" },
	);
	assert.equal(draft.allowed, true);
	assert.equal(draft.isScopedPlanWrite, true);
});

test("isPlanPhaseAllowedMutation allows plan write after ask_user Approve", async () => {
	const root = await mkdtemp(join(tmpdir(), "harness-plan-"));
	const runId = "run-003";
	const ctx = runCtx(runId, root);
	const planPath = canonicalPlanPath(runId, root);
	await mkdir(join(root, ".pi/harness/runs", runId), { recursive: true });
	const entries = [
		{
			type: "custom",
			customType: "harness-plan-attempt",
			data: { run_id: runId, command: "harness-plan" },
		},
		{
			type: "message",
			message: {
				role: "toolResult",
				toolName: "ask_user",
				details: {
					cancelled: false,
					response: { kind: "selection", selections: ["Approve"] },
				},
			},
		},
	];
	assert.equal(hasPlanUserApproval(entries, { sincePlanCommand: true }), true);
	const allowed = await isPlanPhaseAllowedMutation(
		"write",
		{ path: planPath },
		"plan",
		ctx,
		root,
		{ aborted: false, entries, currentSessionId: "sess-1" },
	);
	assert.equal(allowed.allowed, true);
	assert.equal(allowed.isScopedPlanWrite, true);
});

test("isPlanPhaseAllowedMutation blocks src in plan phase", async () => {
	const root = await mkdtemp(join(tmpdir(), "harness-plan-"));
	const runId = "run-004";
	const ctx = runCtx(runId, root);
	const entries = [
		{
			type: "custom",
			customType: "harness-plan-attempt",
			data: { run_id: runId },
		},
		{
			type: "message",
			message: {
				role: "toolResult",
				toolName: "ask_user",
				details: {
					cancelled: false,
					response: { kind: "selection", selections: ["Approve"] },
				},
			},
		},
	];
	const blocked = await isPlanPhaseAllowedMutation(
		"write",
		{ path: join(root, "src/app.ts") },
		"plan",
		ctx,
		root,
		{ aborted: false, entries, currentSessionId: "sess-1" },
	);
	assert.equal(blocked.allowed, false);
});

test("parseAskUserApprovalFromMessage recognizes Approve option", () => {
	const approval = parseAskUserApprovalFromMessage({
		toolName: "ask_user",
		details: {
			cancelled: false,
			response: { kind: "selection", selections: ["Approve"] },
		},
	});
	assert.ok(approval);
});

test("indexOfLastPlanCommand finds harness-plan-attempt", () => {
	const entries = [
		{ type: "custom", customType: "harness-plan-attempt", data: {} },
	];
	assert.equal(indexOfLastPlanCommand(entries), 0);
});

test("isPlanPhaseScopedWrite rejects symlink escape", async () => {
	const root = await mkdtemp(join(tmpdir(), "harness-plan-"));
	const runId = "run-005";
	const ctx = runCtx(runId, root);
	const runDir = join(root, ".pi/harness/runs", runId);
	await mkdir(runDir, { recursive: true });
	const outside = join(root, "outside.txt");
	await writeFile(outside, "secret", "utf-8");
	const linkPath = join(runDir, "plan-packet.yaml");
	try {
		await symlink(outside, linkPath);
	} catch {
		// symlinks may be unsupported; skip
		return;
	}
	assert.equal(await isPlanPhaseScopedWrite(linkPath, ctx, root), false);
});
