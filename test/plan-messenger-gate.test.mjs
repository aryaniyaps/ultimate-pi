import { test } from "node:test";
import assert from "node:assert/strict";
import { planDebateIdForRun, normalizePlanDebateId } from "../.pi/lib/plan-debate-id.ts";
import {
	messengerRoundDebateReady,
	messengerRoundDialogueReady,
} from "../.pi/lib/plan-messenger.ts";
import { validateIntegratorDraft } from "../.pi/lib/plan-review-integrator-rules.ts";
import { assessPlanScopeDrift } from "../.pi/lib/plan-scope-guard.ts";
import { isReviewRoundArtifactPath } from "../.pi/lib/plan-debate-gate.ts";
import {
	extractClaimIds,
	laneArtifactPath,
} from "../.pi/lib/plan-debate-lane.ts";

test("planDebateIdForRun uses run_id", () => {
	assert.equal(planDebateIdForRun("run-abc"), "plan-run-abc");
});

test("normalizePlanDebateId rewrites plan-<plan_id>", () => {
	const r = normalizePlanDebateId("plan-wrong", "run-abc");
	assert.equal(r.debateId, "plan-run-abc");
	assert.equal(r.corrected, true);
});

test("messengerRoundDialogueReady requires settled claims", () => {
	const ok = messengerRoundDialogueReady(
		{
			round_index: 1,
			evaluator_posted: true,
			adversary_posted: true,
			integrator_posted: false,
			claim_count: 2,
			rebuttal_count: 1,
			exchange_count: 2,
			unresolved_claim_ids: [],
		},
		{ max_exchanges_per_round: 3 },
	);
	assert.equal(ok.ok, true);
	const bad = messengerRoundDialogueReady(null, { max_exchanges_per_round: 3 });
	assert.equal(bad.ok, false);
});

test("messengerRoundDebateReady requires integrator after dialogue", () => {
	const ok = messengerRoundDebateReady(
		{
			round_index: 1,
			evaluator_posted: true,
			adversary_posted: true,
			integrator_posted: true,
			claim_count: 2,
			rebuttal_count: 1,
			exchange_count: 1,
			unresolved_claim_ids: [],
		},
		false,
		{ max_exchanges_per_round: 3 },
	);
	assert.equal(ok.ok, true);
});

test("integrator requires disputes when checks fail", () => {
	const r = validateIntegratorDraft(
		{
			review_gate_ready: true,
			hypothesis_validation: { revision_recommended: true },
			disputes: [],
		},
		{ validationTurn: { overall_ready: false, checks: [{ status: "fail" }] } },
	);
	assert.equal(r.ok, false);
	assert.equal(r.review_gate_ready, false);
});

test("scope drift detects infra narrowing", () => {
	const task =
		"Build a live knowledge base product OS with papers, youtube, news, books, and decisions.";
	const decomp =
		"Set up graphify cron systemd timer, feeds.yaml ingest lockfile, graphify update polling.";
	const r = assessPlanScopeDrift(task, decomp);
	assert.equal(r.material_drift, true);
	assert.equal(r.suggested_ask_user, true);
});

test("isReviewRoundArtifactPath", () => {
	assert.equal(isReviewRoundArtifactPath("artifacts/review-round-r3.yaml"), true);
	assert.equal(isReviewRoundArtifactPath("artifacts/validation-turn-r3.yaml"), false);
});

test("extractClaimIds from validation turn checks", () => {
	const ids = extractClaimIds({
		checks: [{ id: "SC-01" }, { id: "SC-02" }],
	});
	assert.deepEqual(ids, ["SC-01", "SC-02"]);
});

test("laneArtifactPath", () => {
	assert.equal(
		laneArtifactPath("validation-turn", 2),
		"artifacts/validation-turn-r2.yaml",
	);
});
