import { test } from "node:test";
import assert from "node:assert/strict";
import {
	debatePhaseFromId,
	isPlanDebateId,
} from "../.pi/lib/debate-orchestrator-types.ts";
import { buildPlanReviewRoundEnvelope } from "../.pi/extensions/lib/plan-debate-envelope.ts";

function capsForDebate(debateId) {
	if (isPlanDebateId(debateId)) {
		return { name: "plan", max_rounds: 4, round_token_cap: 2000, debate_global_cap: 12000 };
	}
	return { name: "aggressive", max_rounds: 6, round_token_cap: 2500, debate_global_cap: 35000 };
}

test("isPlanDebateId detects plan- prefix", () => {
	assert.equal(isPlanDebateId("plan-run-123"), true);
	assert.equal(isPlanDebateId("debate-123"), false);
	assert.equal(debatePhaseFromId("plan-x"), "plan");
	assert.equal(debatePhaseFromId("debate-x"), "post_execute");
});

test("plan debate caps are tighter than aggressive", () => {
	const plan = capsForDebate("plan-smoke");
	const post = capsForDebate("debate-smoke");
	assert.equal(plan.max_rounds, 4);
	assert.equal(post.max_rounds, 6);
	assert.ok(plan.debate_global_cap < post.debate_global_cap);
});

test("buildPlanReviewRoundEnvelope produces bus round", () => {
	const env = buildPlanReviewRoundEnvelope(
		{
			schema_version: "1.0.0",
			round_index: 1,
			round_summary: "ok",
			review_gate_ready: true,
			recommended_packet_patches: [],
			participants: ["PlanEvaluatorAgent", "PlanAdversaryAgent"],
			claims: ["spec ok"],
			token_usage: { per_agent: { PlanEvaluatorAgent: 10 }, round_total: 10 },
		},
		{ runId: "run-1", debateId: "plan-run-1" },
	);
	assert.equal(env.protocol, "pi-debate-bus/v1");
	assert.equal(env.kind, "round");
	assert.equal(env.correlation.debate_id, "plan-run-1");
	assert.ok(env.payload.participants.includes("PlanEvaluatorAgent"));
});
