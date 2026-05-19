import assert from "node:assert/strict";
import test from "node:test";
import { parseSpawnContextFromTask } from "../.pi/lib/harness-spawn-parse.ts";

test("parseSpawnContextFromTask: HarnessSpawnContext={...}", () => {
	const task =
		'HarnessSpawnContext={"run_id":"run-1","run_dir":"/tmp/runs/run-1"} scout lane';
	const ctx = parseSpawnContextFromTask(task);
	assert.equal(ctx?.run_id, "run-1");
	assert.equal(ctx?.run_dir, "/tmp/runs/run-1");
});

test("parseSpawnContextFromTask: nested HarnessSpawnContext JSON key", () => {
	const task = JSON.stringify({
		HarnessSpawnContext: {
			run_id: "019e35dd-fc3d-7a54-b3c2-304fd866e128-1779020224324",
			plan_packet_path:
				"/home/user/.pi/harness/runs/019e35dd/plan-packet.yaml",
			task_summary: "live updating graphify",
			risk_level: "med",
			quick: false,
		},
		lane: "semantic",
	});
	const ctx = parseSpawnContextFromTask(task);
	assert.equal(
		ctx?.run_id,
		"019e35dd-fc3d-7a54-b3c2-304fd866e128-1779020224324",
	);
	assert.equal(
		ctx?.plan_packet_path,
		"/home/user/.pi/harness/runs/019e35dd/plan-packet.yaml",
	);
});

test("parseSpawnContextFromTask: returns null when no run_id", () => {
	assert.equal(parseSpawnContextFromTask("scout semantic only"), null);
});
