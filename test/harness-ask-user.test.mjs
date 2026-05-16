import assert from "node:assert/strict";
import { test } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const {
	normalizeOption,
	validateAskParams,
	formatResultText,
} = await import(
	new URL("../.pi/extensions/lib/ask-user/validate-core.mjs", import.meta.url).href
);

test("normalizeOption accepts string and object", () => {
	assert.deepEqual(normalizeOption("  cloud  "), { title: "cloud" });
	assert.deepEqual(normalizeOption({ title: " self ", description: " d " }), {
		title: "self",
		description: "d",
	});
});

test("validateAskParams rejects empty question", () => {
	const err = validateAskParams({ question: "  " });
	assert.equal(typeof err, "string");
	assert.match(err, /question is required/);
});

test("validateAskParams requires min 2 options when provided", () => {
	const err = validateAskParams({
		question: "Pick one?",
		options: ["only"],
	});
	assert.match(err, /at least 2 options/);
});

test("validateAskParams accepts valid params", () => {
	const v = validateAskParams({
		question: "Mode?",
		options: ["cloud", "self"],
		allowFreeform: false,
	});
	assert.equal(typeof v, "object");
	assert.equal(v.question, "Mode?");
	assert.equal(v.options.length, 2);
	assert.equal(v.allowFreeform, false);
});

test("formatResultText covers selection and cancel", () => {
	assert.match(
		formatResultText({ kind: "selection", selections: ["a"] }, false),
		/User selected: a/,
	);
	assert.match(formatResultText(null, true), /cancelled/i);
});
