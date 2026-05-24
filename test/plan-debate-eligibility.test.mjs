import { test } from "node:test";
import assert from "node:assert/strict";
import { harnessPlanDebateEligibility } from "../.pi/lib/plan-debate-eligibility.ts";
import {
	getPlanFocusCoverage,
	planDebateOutcomeComplete,
} from "../.pi/lib/plan-debate-focus.ts";
import { lanesForRound } from "../.pi/lib/plan-debate-lanes.ts";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("eligibility defaults to standard when ambiguous", () => {
	const r = harnessPlanDebateEligibility({ risk_level: "med" });
	assert.equal(r.profile, "standard");
	assert.deepEqual(r.required_focuses, ["spec", "wbs", "schedule", "quality"]);
});

test("eligibility fast for med with clear stack and no open questions", () => {
	const r = harnessPlanDebateEligibility({
		risk_level: "med",
		material_fork: false,
		dag_pass: true,
		implementation_brief: {
			open_questions: [],
			solution_patterns: [{ risks: [] }],
			similar_implementations: [{ name: "x" }],
			recommended_approach: {
				summary: "ok",
				recommended_approach_confidence: "high",
				confidence_rationale: "refs",
				evidence_refs: ["a", "b"],
			},
		},
		stack_brief: { recommended_primary: "node" },
	});
	assert.equal(r.profile, "fast");
	assert.equal(r.review_gate_strategy.mode, "consolidated");
	assert.deepEqual(r.required_focuses, ["spec", "quality"]);
	assert.equal(r.min_focus_rounds, 1);
});

test("eligibility light for low risk with confident implementation", () => {
	const r = harnessPlanDebateEligibility({
		risk_level: "low",
		material_fork: false,
		dag_pass: true,
		implementation_brief: {
			open_questions: [],
			solution_patterns: [{ risks: [] }],
			similar_implementations: [{ name: "x" }],
			recommended_approach: {
				summary: "ok",
				recommended_approach_confidence: "high",
				confidence_rationale: "two refs",
				evidence_refs: ["a", "b"],
			},
		},
		stack_brief: { recommended_primary: "node" },
	});
	assert.equal(r.profile, "light");
	assert.deepEqual(r.required_focuses, ["spec", "quality"]);
	assert.equal(r.min_focus_rounds, 2);
});

test("conflicting patterns with open questions sets human_required", () => {
	const r = harnessPlanDebateEligibility({
		risk_level: "low",
		implementation_brief: {
			open_questions: ["which pattern?"],
			solution_patterns: [{ name: "a" }, { name: "b" }],
			recommended_approach: {
				summary: "x",
				recommended_approach_confidence: "high",
				confidence_rationale: "r",
				evidence_refs: ["1", "2"],
			},
			similar_implementations: [{}],
		},
		stack_brief: { recommended_primary: "node" },
	});
	assert.equal(r.human_required, true);
	assert.notEqual(r.profile, "light");
});

test("lanesForRound includes sprint-audit on quality focus before round 4", () => {
	const lanes = lanesForRound(2, "quality");
	assert.ok(lanes.includes("sprint-audit"));
	const early = lanesForRound(2, "spec");
	assert.ok(!early.includes("sprint-audit"));
});

test("planDebateOutcomeComplete passes light profile with two focuses", async () => {
	const root = await mkdtemp(join(tmpdir(), "debate-light-"));
	const runDir = join(root, "run");
	const art = join(runDir, "artifacts");
	await mkdir(art, { recursive: true });
	for (const [n, focus] of [
		[1, "spec"],
		[2, "quality"],
	]) {
		await writeFile(
			join(art, `review-round-r${n}.yaml`),
			`schema_version: "1.0.0"\nround_index: ${n}\ndebate_round_focus: ${focus}\nreview_gate_ready: ${n === 2}\n`,
			"utf-8",
		);
	}
	const required = ["spec", "quality"];
	const coverage = await getPlanFocusCoverage(runDir, { requiredFocuses: required });
	assert.deepEqual(coverage.covered, required);
	assert.equal(coverage.missing.length, 0);
	assert.equal(
		planDebateOutcomeComplete(coverage, {
			requiredFocuses: required,
			minRoundIndex: 2,
		}),
		true,
	);
});
