import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	hasPlanReviseRecommendation,
	isPlanRevisePlanningSubagent,
} from "../.pi/extensions/review-integrity.ts";

const planReviseEntries = [
	{
		type: "custom",
		customType: "harness-run-context",
		data: {
			phase: "adversary",
			last_completed_step: "adversary",
			last_outcome: "fail",
			next_recommended_command: "/harness-plan (mode: revise)",
		},
	},
];

describe("review-integrity revise handoff", () => {
	test("detects review outcome recommendation to revise the plan", () => {
		assert.equal(hasPlanReviseRecommendation(planReviseEntries), true);
	});

	test("allows planning subagents during plan revise handoff", () => {
		assert.equal(
			isPlanRevisePlanningSubagent({
				agents: ["harness/planning/decompose"],
				entries: planReviseEntries,
			}),
			true,
		);
	});

	test("does not treat review subagents as planning handoff", () => {
		assert.equal(
			isPlanRevisePlanningSubagent({
				agents: ["harness/reviewing/evaluator"],
				entries: planReviseEntries,
			}),
			false,
		);
	});

	test("does not allow ordinary planning while review has no revise recommendation", () => {
		assert.equal(
			isPlanRevisePlanningSubagent({
				agents: ["harness/planning/decompose"],
				entries: [
					{
						type: "custom",
						customType: "harness-run-context",
						data: { next_recommended_command: "/harness-review" },
					},
				],
			}),
			false,
		);
	});
});
