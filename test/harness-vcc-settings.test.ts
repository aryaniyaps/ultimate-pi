import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import {
	resolveOverrideDefaultCompaction,
	resolveVccDebug,
} from "../.pi/extensions/lib/harness-vcc-settings.ts";

const compactionBackup = process.env.HARNESS_VCC_COMPACTION;
const debugBackup = process.env.HARNESS_VCC_DEBUG;

afterEach(() => {
	if (compactionBackup === undefined) {
		delete process.env.HARNESS_VCC_COMPACTION;
	} else {
		process.env.HARNESS_VCC_COMPACTION = compactionBackup;
	}
	if (debugBackup === undefined) {
		delete process.env.HARNESS_VCC_DEBUG;
	} else {
		process.env.HARNESS_VCC_DEBUG = debugBackup;
	}
});

describe("resolveOverrideDefaultCompaction", () => {
	test("defaults to true when env unset", () => {
		delete process.env.HARNESS_VCC_COMPACTION;
		assert.equal(resolveOverrideDefaultCompaction(), true);
	});

	test("HARNESS_VCC_COMPACTION=false opts into Pi LLM compaction", () => {
		process.env.HARNESS_VCC_COMPACTION = "false";
		assert.equal(resolveOverrideDefaultCompaction(), false);
	});

	test("HARNESS_VCC_COMPACTION=0 and off also disable override", () => {
		process.env.HARNESS_VCC_COMPACTION = "0";
		assert.equal(resolveOverrideDefaultCompaction(), false);
		process.env.HARNESS_VCC_COMPACTION = "off";
		assert.equal(resolveOverrideDefaultCompaction(), false);
	});

	test("HARNESS_VCC_COMPACTION=true forces override", () => {
		process.env.HARNESS_VCC_COMPACTION = "true";
		assert.equal(resolveOverrideDefaultCompaction(), true);
	});
});

describe("resolveVccDebug", () => {
	test("defaults to false when env unset", () => {
		delete process.env.HARNESS_VCC_DEBUG;
		assert.equal(resolveVccDebug(), false);
	});

	test("HARNESS_VCC_DEBUG=true enables debug snapshots", () => {
		process.env.HARNESS_VCC_DEBUG = "true";
		assert.equal(resolveVccDebug(), true);
	});
});
