import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPlanPacketLines } from "../.pi/extensions/lib/plan-approval/format-plan.ts";
import { parsePlanApprovalFromMessage } from "../.pi/lib/harness-run-context.ts";

const samplePacket = {
	schema_version: "1.0.0",
	contract_version: "1.0.0",
	plan_id: "plan-001",
	task_id: "task-001",
	scope: "Implement plan approval TUI widget for harness planner.",
	assumptions: ["Pi TUI available"],
	risk_level: "med",
	acceptance_checks: ["Single approval overlay", "Parent harness-plan-approval synced"],
	rollback_plan: {
		revert_commit_ready: true,
		rollback_artifacts: {
			revert_command: "git revert HEAD",
			revert_branch: "main",
			patch_bundle: "/tmp/plan.patch",
		},
	},
};

test("formatPlanPacketLines includes plan_id and acceptance checks", () => {
	const lines = formatPlanPacketLines(samplePacket, 80);
	const text = lines.join("\n");
	assert.match(text, /plan_id: plan-001/);
	assert.match(text, /acceptance_checks:/);
	assert.match(text, /1\. Single approval overlay/);
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
