import { test } from "node:test";
import assert from "node:assert/strict";
import {
	appendPlanApprovalIfNew,
	hasApprovedPlanSignalFromUserPrompt,
	hasPlanUserApproval,
	indexOfLastPlanCommand,
	isPlanApprovalAskUser,
	parsePlanApprovalFromMessage,
} from "../.pi/lib/harness-run-context.ts";

test("hasApprovedPlanSignalFromUserPrompt ignores bare PlanPacket in template text", () => {
	const template =
		'Run /harness-plan. Output must include a PlanPacket JSON block with plan_id.';
	assert.equal(hasApprovedPlanSignalFromUserPrompt(template), false);
});

test("hasApprovedPlanSignalFromUserPrompt accepts explicit user approval cues", () => {
	assert.equal(
		hasApprovedPlanSignalFromUserPrompt("The user approved this plan."),
		true,
	);
});

test("isPlanApprovalAskUser detects plan approval ask_user shape", () => {
	assert.equal(
		isPlanApprovalAskUser({
			question: "Approve this plan for execution?",
			options: ["Approve", "Request changes", "Cancel"],
		}),
		true,
	);
	assert.equal(
		isPlanApprovalAskUser({
			question: "Which search backend?",
			options: ["DDG", "SearXNG"],
		}),
		false,
	);
});

test("appendPlanApprovalIfNew dedupes parent harness-plan-approval", () => {
	const entries = [
		{ type: "custom", customType: "harness-turn", data: { command: "harness-plan" } },
	];
	const appended = [];
	const approval = parsePlanApprovalFromMessage({
		toolName: "approve_plan",
		details: {
			cancelled: false,
			plan_packet: { plan_id: "plan-001" },
			response: { kind: "selection", selections: ["Approve"] },
		},
	});
	assert.ok(approval);
	const first = appendPlanApprovalIfNew(
		(type, data) => {
			appended.push({ type, data });
			entries.push({ type: "custom", customType: type, data });
		},
		entries,
		approval,
		null,
	);
	const second = appendPlanApprovalIfNew(
		(type, data) => {
			appended.push({ type, data });
			entries.push({ type: "custom", customType: type, data });
		},
		entries,
		approval,
		null,
	);
	assert.equal(first, true);
	assert.equal(second, false);
	assert.equal(appended.length, 1);
	assert.equal(
		hasPlanUserApproval(entries, { sincePlanCommand: true }),
		true,
	);
});

test("indexOfLastPlanCommand still finds harness-plan turn", () => {
	const entries = [
		{ type: "custom", customType: "harness-plan-attempt", data: {} },
	];
	assert.equal(indexOfLastPlanCommand(entries), 0);
});

test("hasPlanUserApproval after bridged approve_plan blocks duplicate parent approval", () => {
	const entries = [
		{ type: "custom", customType: "harness-turn", data: { command: "harness-plan" } },
		{
			type: "custom",
			customType: "harness-plan-approval",
			data: {
				plan_id: "plan-001",
				approved_at: "2026-05-17T00:00:00.000Z",
				source: "approve_plan",
			},
		},
	];
	assert.equal(hasPlanUserApproval(entries, { sincePlanCommand: true }), true);
});
