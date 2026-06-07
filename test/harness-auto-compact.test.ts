import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import {
	createCompactGateState,
	evaluateAutoCompactGate,
	onSessionCompact,
} from "../.pi/lib/harness-auto-compact-policy.ts";

const autoBackup = process.env.HARNESS_COMPACT_AUTO;
const thresholdBackup = process.env.HARNESS_COMPACT_THRESHOLD_PERCENT;
const rearmBackup = process.env.HARNESS_COMPACT_REARM_PERCENT;

afterEach(() => {
	if (autoBackup === undefined) delete process.env.HARNESS_COMPACT_AUTO;
	else process.env.HARNESS_COMPACT_AUTO = autoBackup;
	if (thresholdBackup === undefined)
		delete process.env.HARNESS_COMPACT_THRESHOLD_PERCENT;
	else process.env.HARNESS_COMPACT_THRESHOLD_PERCENT = thresholdBackup;
	if (rearmBackup === undefined)
		delete process.env.HARNESS_COMPACT_REARM_PERCENT;
	else process.env.HARNESS_COMPACT_REARM_PERCENT = rearmBackup;
});

describe("evaluateAutoCompactGate", () => {
	test("fires at 50% when armed", () => {
		process.env.HARNESS_COMPACT_AUTO = "true";
		process.env.HARNESS_COMPACT_THRESHOLD_PERCENT = "50";
		const state = createCompactGateState();
		const d = evaluateAutoCompactGate({ percent: 50 }, state);
		assert.equal(d.shouldCompact, true);
	});

	test("suppressed at 49%", () => {
		process.env.HARNESS_COMPACT_AUTO = "true";
		const state = createCompactGateState();
		const d = evaluateAutoCompactGate({ percent: 49 }, state);
		assert.equal(d.shouldCompact, false);
	});

	test("hysteresis re-arms below 40%", () => {
		process.env.HARNESS_COMPACT_AUTO = "true";
		process.env.HARNESS_COMPACT_REARM_PERCENT = "40";
		const state = createCompactGateState();
		onSessionCompact(state);
		const blocked = evaluateAutoCompactGate({ percent: 55 }, state);
		assert.equal(blocked.shouldCompact, false);
		const rearmed = evaluateAutoCompactGate({ percent: 35 }, state);
		assert.equal(rearmed.shouldCompact, false);
		const fired = evaluateAutoCompactGate({ percent: 50 }, state);
		assert.equal(fired.shouldCompact, true);
	});
});
