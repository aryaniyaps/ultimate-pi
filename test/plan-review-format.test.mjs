import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	canonicalPlanReviewPath,
	extractLatestPlanPacketFromEntries,
	formatPlanPacketMarkdown,
	formatResearchBriefMarkdown,
	writePlanReviewMarkdown,
} from "../.pi/extensions/lib/plan-approval/plan-review.ts";
import { createFreshRunContext } from "../.pi/lib/harness-run-context.ts";

const samplePacket = {
	schema_version: "1.0.0",
	contract_version: "1.0.0",
	plan_id: "plan-001",
	task_id: "task-001",
	scope: "Build a live knowledge base with synthesis.",
	assumptions: ["Single-user web app"],
	risk_level: "med",
	acceptance_checks: ["Ingestion pipeline", "Synthesis engine"],
	rollback_plan: {
		revert_commit_ready: true,
		rollback_artifacts: {
			revert_command: "git revert HEAD",
			revert_branch: "main",
			patch_bundle: "/tmp/plan.patch",
		},
	},
};

const sampleResearchBrief = {
	decomposition: {
		problem_restatement: "Add rate limiting to the harness API.",
		problem_types: ["design"],
		scope: { narrowed_focus: "HTTP middleware only", excluded: ["UI"] },
		hard_constraints: ["No breaking API changes"],
		core_tension: "Safety vs latency",
		prior_art: {
			best_approach: "Token bucket in middleware",
			gap: "No per-run budgets",
			dead_ends: ["Global process limit only"],
		},
	},
	hypothesis: {
		primary: {
			claim: "Per-run token bucket in policy-gate reduces burst abuse.",
			mechanism: "Middleware keyed by run_id",
			prediction: "p99 latency under 5ms at 100 rps",
			experiment: "Load test with k6",
			tension_resolution: "Bounds burst without global cap",
		},
		dialectical_fork: {
			fork: "In-memory vs Redis backend",
			path_a: "In-process map",
			path_b: "Redis sliding window",
		},
	},
	eval: {
		dimensions: {
			novelty: { score: 72, rationale: "Combines run context with limiter" },
			coherence: { score: 88, rationale: "Clear middleware hook" },
			testability: { score: 90, rationale: "k6 script specified" },
			impact: { score: 75, rationale: "Meaningful for multi-tenant runs" },
		},
		relevance: { passes: true, rationale: "Addresses rate limiting task" },
	},
};

test("formatResearchBriefMarkdown renders decomposition and eval table", () => {
	const md = formatResearchBriefMarkdown(sampleResearchBrief);
	assert.match(md, /Phase 1 — Problem decomposition/);
	assert.match(md, /Core tension/);
	assert.match(md, /Phase 2 — DARWIN hypothesis/);
	assert.match(md, /Dialectical fork/);
	assert.match(md, /Self-evaluation/);
	assert.match(md, /testability \| 90\/100/);
});

test("formatPlanPacketMarkdown includes research brief sections", () => {
	const md = formatPlanPacketMarkdown(samplePacket, {
		human_summary: "Rate limit MVP",
		research_brief: sampleResearchBrief,
	});
	assert.match(md, /Phase 1 — Problem decomposition/);
	assert.match(md, /## Plan packet/);
});

test("formatPlanPacketMarkdown includes scope and acceptance checks", () => {
	const md = formatPlanPacketMarkdown(samplePacket, {
		human_summary: "Product OS MVP",
		status: "draft",
	});
	assert.match(md, /# Harness plan/);
	assert.match(md, /Product OS MVP/);
	assert.match(md, /acceptance_checks/);
	assert.match(md, /Review this file in your editor/);
});

test("writePlanReviewMarkdown writes plan-review.md under run dir", async () => {
	const root = await mkdtemp(join(tmpdir(), "plan-review-"));
	const ctx = createFreshRunContext("sess-test", root, "smoke task");
	const path = await writePlanReviewMarkdown(root, ctx, samplePacket, {
		status: "draft",
		research_brief: sampleResearchBrief,
	});
	assert.ok(path);
	assert.equal(path, canonicalPlanReviewPath(ctx.run_id, root));
	const text = await readFile(path, "utf-8");
	assert.match(text, /plan_id/);
	assert.match(text, /DARWIN hypothesis/);
});

test("extractLatestPlanPacketFromEntries reads harness-plan-draft", () => {
	const entries = [
		{
			type: "custom",
			customType: "harness-plan-draft",
			data: {
				plan_packet: samplePacket,
				human_summary: "draft",
			},
		},
	];
	const found = extractLatestPlanPacketFromEntries(entries);
	assert.ok(found);
	assert.equal(found.packet.plan_id, "plan-001");
});
