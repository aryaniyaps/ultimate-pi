import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPlanApprovalMarkdown } from "../.pi/extensions/lib/plan-approval/dialog.ts";

const samplePacket = {
	schema_version: "1.0.0",
	contract_version: "1.0.0",
	plan_id: "plan-001",
	task_id: "task-001",
	scope: "Implement plan approval as markdown plus ask_user-style prompt.",
	assumptions: ["Pi UI available"],
	risk_level: "med",
	acceptance_checks: ["Full plan visible", "Inline approval options"],
	rollback_plan: {
		revert_commit_ready: true,
		rollback_artifacts: {
			revert_command: "git revert HEAD",
			revert_branch: "main",
			patch_bundle: "/tmp/plan.patch",
		},
	},
};

test("buildPlanApprovalMarkdown includes scope and acceptance checks", () => {
	const md = buildPlanApprovalMarkdown({
		plan_packet: samplePacket,
		human_summary: "Live graph update system",
		options: [
			{ title: "Approve" },
			{ title: "Request changes" },
			{ title: "Cancel" },
		],
		displayMode: "inline",
	});
	assert.match(md, /^# Harness plan/m);
	assert.match(md, /Live graph update system/);
	assert.match(md, /Implement plan approval/);
	assert.match(md, /Full plan visible/);
	assert.match(md, /ask_user/);
});
