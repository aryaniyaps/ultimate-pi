import assert from "node:assert/strict";
import test from "node:test";
import { validateAgainstHarnessSchema } from "../.pi/lib/harness-schema-validate.ts";

const SPECS = ".pi/harness/specs";

test("validateAgainstHarnessSchema compiles plan-hypothesis-brief without remote $schema fetch", async () => {
	const doc = {
		schema_version: "1.0.0",
		primary: {
			claim: "c",
			mechanism: "m",
			prediction: "p",
			experiment: "e",
			tension_resolution: "t",
		},
		dialectical_fork: { fork: "f", path_a: "a", path_b: "b" },
		alternatives: [{ claim: "alt", key_bet: "bet" }],
		recommended_next_steps: ["x"],
	};
	const result = await validateAgainstHarnessSchema(
		SPECS,
		"plan-hypothesis-brief.schema.json",
		doc,
	);
	assert.equal(result.ok, true);
});

test("validateAgainstHarnessSchema compiles sentrux-manifest-proposal", async () => {
	const result = await validateAgainstHarnessSchema(
		SPECS,
		"sentrux-manifest-proposal.schema.json",
		{
			schema_version: "1.0.0",
			change_class: "none",
			summary: "Existing layer globs cover scope",
			evidence: [
				{
					source: "graphify",
					ref: "graphify-out/GRAPH_REPORT.md",
					summary: "No new god-node community for added paths",
				},
			],
			manifest_patch: {},
			adr_required: false,
			human_required: false,
		},
	);
	assert.equal(result.ok, true);
});

test("validateAgainstHarnessSchema compiles sentrux-signal", async () => {
	const result = await validateAgainstHarnessSchema(
		SPECS,
		"sentrux-signal.schema.json",
		{
			schema_version: "1.0.0",
			run_id: "run-test",
			check_pass: true,
			gate_status: "pass",
			quality_signal_summary: "baseline held",
			recorded_at: "2026-05-23T00:00:00.000Z",
			phase: "execute",
		},
	);
	assert.equal(result.ok, true);
});

test("validateAgainstHarnessSchema compiles ls-lint-manifest-proposal", async () => {
	const result = await validateAgainstHarnessSchema(
		SPECS,
		"ls-lint-manifest-proposal.schema.json",
		{
			schema_version: "1.0.0",
			change_class: "none",
			summary: "Existing naming rules cover scope",
			evidence: [
				{
					source: "ls-lint",
					ref: "harness-ls-lint-cli.mjs",
					summary: "No violations on planned paths",
				},
			],
			manifest_patch: {},
			adr_required: false,
			human_required: false,
		},
	);
	assert.equal(result.ok, true);
});

test("validateAgainstHarnessSchema compiles ls-lint-signal", async () => {
	const result = await validateAgainstHarnessSchema(
		SPECS,
		"ls-lint-signal.schema.json",
		{
			schema_version: "1.0.0",
			run_id: "run-test",
			lint_pass: true,
			violation_count: 0,
			status: "pass",
			quality_signal_summary: "pass",
			recorded_at: "2026-05-23T00:00:00.000Z",
			phase: "execute",
		},
	);
	assert.equal(result.ok, true);
});

test("validateAgainstHarnessSchema compiles plan-decomposition-brief schema", async () => {
	const result = await validateAgainstHarnessSchema(
		SPECS,
		"plan-decomposition-brief.schema.json",
		{
			schema_version: "1.0.0",
			problem_restatement: "p",
			work_items: [],
			dependencies: [],
			sequencing_notes: "n",
		},
	);
	assert.equal(result.ok, false);
	assert.ok(Array.isArray(result.errors));
	assert.ok(result.errors.length > 0);
});
