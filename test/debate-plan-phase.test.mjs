import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	debatePhaseFromId,
	isPlanDebateId,
} from "../.pi/lib/debate-orchestrator-types.ts";
import { capsForDebate } from "../.pi/extensions/lib/debate-bus-core.ts";
import { lanesForRound } from "../.pi/extensions/lib/plan-debate-lanes.ts";
import { buildPlanReviewRoundEnvelope } from "../.pi/extensions/lib/plan-debate-envelope.ts";
import {
	getPlanFocusCoverage,
	planDebateOutcomeComplete,
	PLAN_FOCUS_AREAS,
} from "../.pi/extensions/lib/plan-debate-focus.ts";
import {
	messengerRoundDialogueReady,
	messengerRoundDebateReady,
	syncRoundStateFromTranscript,
} from "../.pi/extensions/lib/plan-messenger.ts";

test("isPlanDebateId detects plan- prefix", () => {
	assert.equal(isPlanDebateId("plan-run-123"), true);
	assert.equal(isPlanDebateId("debate-123"), false);
	assert.equal(debatePhaseFromId("plan-x"), "plan");
	assert.equal(debatePhaseFromId("debate-x"), "post_execute");
});

function withBudgetEnforce(fn) {
	const prev = process.env.HARNESS_BUDGET_ENFORCE;
	process.env.HARNESS_BUDGET_ENFORCE = "1";
	try {
		fn();
	} finally {
		if (prev === undefined) delete process.env.HARNESS_BUDGET_ENFORCE;
		else process.env.HARNESS_BUDGET_ENFORCE = prev;
	}
}

test("plan debate caps respect light profile", () => {
	withBudgetEnforce(() => {
		const light = capsForDebate("plan-smoke", "light");
		assert.equal(light.min_focus_rounds, 2);
		assert.equal(light.debate_global_cap, 40000);
	});
});

test("plan debate caps use outcome-based budget profile", () => {
	withBudgetEnforce(() => {
		const plan = capsForDebate("plan-smoke");
		const post = capsForDebate("debate-smoke");
		assert.equal(plan.name, "plan");
		assert.equal(plan.min_focus_rounds, 4);
		assert.equal(plan.max_rounds, 12);
		assert.equal(plan.max_exchanges_per_round, 3);
		assert.equal(plan.round_token_cap, 8000);
		assert.equal(plan.debate_global_cap, 80000);
		assert.equal(post.max_rounds, 6);
		assert.ok(plan.debate_global_cap > post.debate_global_cap);
	});
});

test("plan debate caps are relaxed when budget enforce is off", () => {
	const prev = process.env.HARNESS_BUDGET_ENFORCE;
	delete process.env.HARNESS_BUDGET_ENFORCE;
	try {
		const plan = capsForDebate("plan-smoke");
		assert.equal(plan.max_rounds, 999);
		assert.equal(plan.max_exchanges_per_round, 99);
	} finally {
		if (prev !== undefined) process.env.HARNESS_BUDGET_ENFORCE = prev;
	}
});

test("buildPlanReviewRoundEnvelope produces bus round", () => {
	const env = buildPlanReviewRoundEnvelope(
		{
			schema_version: "1.0.0",
			round_index: 1,
			debate_round_focus: "spec",
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

test("getPlanFocusCoverage tracks four focuses", async () => {
	const root = await mkdtemp(join(tmpdir(), "debate-focus-"));
	const runDir = join(root, "run");
	const art = join(runDir, "artifacts");
	await mkdir(art, { recursive: true });
	for (const [n, focus] of [
		[1, "spec"],
		[2, "wbs"],
		[3, "schedule"],
		[4, "quality"],
	]) {
		await writeFile(
			join(art, `review-round-r${n}.yaml`),
			`schema_version: "1.0.0"\nround_index: ${n}\ndebate_round_focus: ${focus}\nreview_gate_ready: true\n`,
			"utf-8",
		);
	}
	const coverage = await getPlanFocusCoverage(runDir);
	assert.deepEqual(coverage.covered, [...PLAN_FOCUS_AREAS]);
	assert.equal(coverage.missing.length, 0);
	assert.equal(coverage.last_review_gate_ready, true);
	assert.equal(planDebateOutcomeComplete(coverage), true);
});

test("lanesForRound sprint-audit on quality focus at round 2", () => {
	const lanes = lanesForRound(2, "quality");
	assert.ok(lanes.includes("sprint-audit"));
});

test("messenger dialogue requires settlement or max exchanges", () => {
	const messages = [
		{
			from: "PlanEvaluatorAgent",
			kind: "claim",
			claim_ids: ["c1"],
			in_reply_to: [],
		},
		{
			from: "PlanAdversaryAgent",
			kind: "rebuttal",
			claim_ids: [],
			in_reply_to: ["c1"],
		},
	];
	const round = syncRoundStateFromTranscript(
		{
			round_index: 1,
			evaluator_posted: false,
			adversary_posted: false,
			integrator_posted: false,
			claim_count: 0,
			rebuttal_count: 0,
			exchange_count: 0,
			unresolved_claim_ids: [],
		},
		messages,
	);
	const unsettled = messengerRoundDialogueReady(round, {
		max_exchanges_per_round: 3,
	});
	assert.equal(unsettled.ok, false);
	const settled = syncRoundStateFromTranscript(round, [
		...messages,
		{
			from: "PlanEvaluatorAgent",
			kind: "clarification",
			claim_ids: ["c1"],
			in_reply_to: ["c1"],
		},
	]);
	assert.equal(
		messengerRoundDialogueReady(settled, { max_exchanges_per_round: 3 }).ok,
		true,
	);
	const withIntegrator = { ...settled, integrator_posted: true };
	assert.equal(
		messengerRoundDebateReady(withIntegrator, false, {
			max_exchanges_per_round: 3,
		}).ok,
		true,
	);
});
