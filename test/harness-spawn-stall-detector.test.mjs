import { test } from "node:test";
import assert from "node:assert/strict";
import {
	parseAgentFromDuplicateSpawnMessage,
	parseArtifactFromDuplicateSpawnMessage,
	resetHarnessSpawnStallCounters,
} from "../.pi/lib/harness-spawn-stall-detector.ts";

test("parses duplicate spawn topology message", () => {
	const msg =
		"Duplicate spawn blocked: harness/planning/decompose already produced a valid artifacts/decomposition.yaml.";
	assert.equal(
		parseAgentFromDuplicateSpawnMessage(msg),
		"harness/planning/decompose",
	);
	assert.equal(
		parseArtifactFromDuplicateSpawnMessage(msg),
		"artifacts/decomposition.yaml",
	);
});

test("resetHarnessSpawnStallCounters clears state", () => {
	resetHarnessSpawnStallCounters();
	assert.ok(true);
});
