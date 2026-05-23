import { test } from "node:test";
import assert from "node:assert/strict";
import {
	laneArtifactPathsForConsolidatedRound,
	lanesForConsolidatedRound,
} from "../.pi/extensions/lib/plan-debate-lanes.ts";

test("consolidated round includes blind hypothesis-validation lane", () => {
	const lanes = lanesForConsolidatedRound();
	assert.ok(lanes.includes("hypothesis-validation"));
	assert.equal(lanes[0], "hypothesis-validation");
	const paths = laneArtifactPathsForConsolidatedRound();
	assert.ok(
		paths.includes("artifacts/hypothesis-validation-r1.yaml"),
		`paths: ${paths.join(", ")}`,
	);
});
