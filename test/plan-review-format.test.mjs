import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	canonicalPlanReviewPath,
	extractLatestPlanPacketFromEntries,
	formatPlanPacketMarkdown,
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
	});
	assert.ok(path);
	assert.equal(path, canonicalPlanReviewPath(ctx.run_id, root));
	const text = await readFile(path, "utf-8");
	assert.match(text, /plan_id/);
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
