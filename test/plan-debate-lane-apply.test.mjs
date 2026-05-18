import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { applyDebateLane } from "../.pi/extensions/lib/plan-debate-lane.ts";
import { readRoundTranscript } from "../.pi/extensions/lib/plan-messenger.ts";

test("applyDebateLane writes validation-turn and posts claim", async () => {
	const runDir = await mkdtemp(join(tmpdir(), "debate-lane-"));
	const yaml = `schema_version: "1.0.0"
round_index: 1
debate_round_focus: spec
checks:
  - id: SC-01
    status: fail
    evidence: test
overall_ready: false
human_summary: evaluator claims
`;
	const result = await applyDebateLane({
		runDir,
		lane: "validation-turn",
		content: yaml,
	});
	assert.equal(result.ok, true);
	assert.equal(result.messenger_posted, true);
	const written = await readFile(
		join(runDir, "artifacts/validation-turn-r1.yaml"),
		"utf-8",
	);
	assert.match(written, /SC-01/);
	const transcript = await readRoundTranscript(runDir, 1);
	assert.equal(transcript.length, 1);
	assert.equal(transcript[0].kind, "claim");
});
