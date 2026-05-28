import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	buildPlanDebateGateRecovery,
	validatePlanDebateGate,
} from "../.pi/lib/plan-debate-gate.ts";

test("buildPlanDebateGateRecovery lists next lane for threaded R1 spec", async () => {
	const root = await mkdtemp(join(tmpdir(), "harness-gate-recovery-"));
	const runId = "test-run-recovery";
	const runDir = join(root, ".pi", "harness", "runs", runId);
	await mkdir(join(runDir, "debate-messenger"), { recursive: true });
	await mkdir(join(runDir, "artifacts"), { recursive: true });
	await writeFile(
		join(runDir, "debate-messenger", "state.json"),
		JSON.stringify({
			schema_version: "1.0.0",
			run_id: runId,
			rounds: {},
			debate_profile: "full",
			required_focuses: ["spec", "wbs", "schedule", "quality"],
			review_gate_mode: "threaded",
		}),
		"utf-8",
	);

	const gate = await validatePlanDebateGate(root, runId);
	assert.equal(gate.ok, false);

	const recovery = await buildPlanDebateGateRecovery(root, runId, gate);
	assert.match(recovery, /Next round: 1 \(focus: spec\)/);
	assert.match(recovery, /hypothesis-validation-r1\.yaml/);
	assert.match(recovery, /hypothesis-validator/);
	assert.match(recovery, /harness_debate_consensus/);
});
