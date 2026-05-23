import { test } from "node:test";
import assert from "node:assert/strict";
import {
	buildHarnessSpawnContextSnippet,
	criticalPathWorkItemIdsFromPlanPacket,
} from "../.pi/lib/harness-run-context.ts";

test("criticalPathWorkItemIdsFromPlanPacket reads schedule_metadata", () => {
	const ids = criticalPathWorkItemIdsFromPlanPacket({
		execution_plan: {
			schedule_metadata: {
				critical_path_work_item_ids: ["WI-1", "WI-2"],
			},
		},
	});
	assert.deepEqual(ids, ["WI-1", "WI-2"]);
});

test("buildHarnessSpawnContextSnippet embeds critical path for execute", () => {
	const snippet = buildHarnessSpawnContextSnippet(
		{
			schema_version: "1.0.0",
			run_id: "run-1",
			pi_session_id: "s",
			project_root: "/tmp",
			phase: "execute",
			plan_id: "p",
			plan_packet_path: "/tmp/plan.yaml",
			plan_ready: true,
			task_summary: "task",
			status: "active",
			last_completed_step: null,
			last_outcome: null,
			next_recommended_command: null,
			owner_pi_session_id: "s",
			updated_at: "2026-01-01T00:00:00.000Z",
		},
		{
			mode: "execute",
			critical_path_work_item_ids: ["WI-1"],
		},
	);
	const parsed = JSON.parse(snippet);
	assert.deepEqual(parsed.critical_path_work_item_ids, ["WI-1"]);
	assert.equal(parsed.mode, "execute");
});
