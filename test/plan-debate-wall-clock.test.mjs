import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDebateWallClock } from "../.pi/lib/plan-debate-wall-clock.ts";

test("checkDebateWallClock not exceeded when within limit", () => {
	const opened = new Date(Date.now() - 60_000).toISOString();
	const r = checkDebateWallClock({ opened_at: opened, debate_profile: "fast" });
	assert.equal(r.exceeded, false);
	assert.ok(r.elapsed_ms < r.limit_ms);
});

test("checkDebateWallClock exceeded when over limit", () => {
	const opened = new Date(Date.now() - 600_000).toISOString();
	const r = checkDebateWallClock({ opened_at: opened, debate_profile: "fast" });
	assert.equal(r.exceeded, true);
});
