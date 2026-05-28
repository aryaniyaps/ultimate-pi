import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import {
	collectExternalSchemaRefs,
	compileHarnessSchema,
	validateAgainstHarnessSchema,
	verifyHarnessSchemaRefIntegrity,
	verifyHarnessSchemasCompile,
} from "../.pi/lib/harness-schema-validate.ts";

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

test("validateAgainstHarnessSchema compiles plan-execution-plan-brief cross-file $ref", async () => {
	const result = await validateAgainstHarnessSchema(
		SPECS,
		"plan-execution-plan-brief.schema.json",
		{
			schema_version: "1.0.0",
			execution_plan: {
				schema_version: "1.0.0",
				phases: [
					{
						phase_id: "P1",
						name: "Phase 1",
						objective: "obj",
						entry_criteria: ["in"],
						exit_criteria: ["out"],
						milestone: "M1",
						work_item_ids: ["WI-1"],
					},
				],
				work_items: [
					{
						work_item_id: "WI-1",
						phase_id: "P1",
						title: "t",
						description: "d",
						depends_on: [],
						files: [],
						parallel_safe: false,
						done_criteria: { type: "manual", spec: "done" },
						acceptance_check_ids: ["AC-1"],
					},
				],
				sprint_contract: {
					in_scope: ["a"],
					out_of_scope: ["b"],
					definition_of_done: "done",
					assumptions: ["x"],
					external_dependencies: [],
				},
				wbs_dictionary: [
					{
						work_item_id: "WI-1",
						deliverable: "d",
						owner_role: "executor",
						inputs: [],
						outputs: [],
					},
				],
				risk_register: [
					{
						risk_id: "R1",
						description: "r",
						likelihood: "low",
						impact: "low",
						mitigation: "m",
						linked_work_item_ids: ["WI-1"],
					},
				],
				schedule_metadata: {
					critical_path_work_item_ids: ["WI-1"],
					parallel_groups: [],
					schedule_baseline_note: "n",
				},
				dag_validation: {
					status: "pass",
					topological_order: ["WI-1"],
					cycles: [],
					conflicts: [],
				},
			},
		},
	);
	if (!result.ok) {
		assert.ok(
			!result.errors.some((e) => e.includes("schema compile failed")),
			`expected validation errors only, got: ${result.errors.join("; ")}`,
		);
	}
});

test("every harness spec schema compiles (Ajv, incl. cross-file $ref)", async () => {
	const files = (await readdir(SPECS)).filter((n) => n.endsWith(".schema.json"));
	const integrity = await verifyHarnessSchemaRefIntegrity(SPECS);
	assert.equal(integrity.ok, true, integrity.errors?.join("\n"));
	const compiled = await verifyHarnessSchemasCompile(SPECS, files);
	assert.equal(compiled.ok, true, compiled.errors?.join("\n"));
});

test("plan-packet.schema.json compiles with execution_plan $ref", async () => {
	const result = await compileHarnessSchema(SPECS, "plan-packet.schema.json");
	assert.equal(result.ok, true, !result.ok ? result.error : "");
	const brief = await compileHarnessSchema(
		SPECS,
		"plan-execution-plan-brief.schema.json",
	);
	assert.equal(brief.ok, true, !brief.ok ? brief.error : "");
});

test("collectExternalSchemaRefs finds sibling schema files only", async () => {
	const brief = JSON.parse(
		await readFile(`${SPECS}/plan-execution-plan-brief.schema.json`, "utf-8"),
	);
	const refs = new Set();
	collectExternalSchemaRefs(brief, refs);
	assert.deepEqual(refs, new Set(["plan-execution-plan.schema.json"]));
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
