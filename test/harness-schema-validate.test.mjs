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
