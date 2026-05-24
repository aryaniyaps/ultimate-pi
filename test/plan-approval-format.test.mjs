import { test } from "node:test";
import assert from "node:assert/strict";
import {
	formatPlanPacketLines,
	formatPlanPacketYaml,
} from "../.pi/lib/plan-approval/format-plan.ts";
import { parsePlanApprovalFromMessage } from "../.pi/lib/harness-run-context.ts";

const samplePacket = {
	schema_version: "1.0.0",
	contract_version: "1.1.0",
	plan_id: "plan-001",
	task_id: "task-001",
	scope: "Implement plan approval display for harness planner.",
	assumptions: ["Pi UI available"],
	risk_level: "med",
	acceptance_checks: [
		{ id: "AC-1", description: "Full YAML plan visible" },
		{ id: "AC-2", description: "Parent harness-plan-approval synced" },
	],
	rollback_plan: {
		revert_commit_ready: true,
		rollback_artifacts: {
			revert_command: "git revert HEAD",
			revert_branch: "main",
			patch_bundle: "/tmp/plan.patch",
		},
	},
	execution_plan: {
		schema_version: "1.0.0",
		phases: [
			{
				phase_id: "P1",
				name: "Foundation",
				work_item_ids: ["WI-1"],
			},
		],
		work_items: [
			{
				work_item_id: "WI-1",
				phase_id: "P1",
				title: "Render nested YAML",
				depends_on: [],
				done_criteria: { type: "manual", spec: "Nested objects visible" },
			},
		],
	},
};

test("formatPlanPacketYaml renders nested execution_plan and structured acceptance_checks", () => {
	const yaml = formatPlanPacketYaml(samplePacket);
	assert.match(yaml, /^plan_id: plan-001/m);
	assert.match(yaml, /acceptance_checks:/);
	assert.match(yaml, /id: AC-1/);
	assert.match(yaml, /description: Full YAML plan visible/);
	assert.match(yaml, /execution_plan:/);
	assert.match(yaml, /work_item_id: WI-1/);
	assert.match(yaml, /done_criteria:/);
	assert.match(yaml, /type: manual/);
});

test("formatPlanPacketLines preserves YAML line structure", () => {
	const lines = formatPlanPacketLines(samplePacket, 200);
	const text = lines.join("\n");
	assert.match(text, /execution_plan:/);
	assert.match(text, /work_items:/);
});

test("parsePlanApprovalFromMessage recognizes approve_plan Approve", () => {
	const approval = parsePlanApprovalFromMessage({
		toolName: "approve_plan",
		details: {
			cancelled: false,
			plan_packet: samplePacket,
			response: { kind: "selection", selections: ["Approve"] },
		},
	});
	assert.ok(approval);
	assert.equal(approval.plan_id, "plan-001");
	assert.equal(approval.source, "approve_plan");
});

test("parsePlanApprovalFromMessage ignores approve_plan Cancel", () => {
	const approval = parsePlanApprovalFromMessage({
		toolName: "approve_plan",
		details: {
			cancelled: false,
			plan_packet: samplePacket,
			response: { kind: "selection", selections: ["Cancel"] },
		},
	});
	assert.equal(approval, null);
});
