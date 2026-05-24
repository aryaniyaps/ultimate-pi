import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("subprocess governance bundle path exists", () => {
	const path = join(
		root,
		".pi",
		"extensions",
		"harness-subagent-governance.ts",
	);
	const src = readFileSync(path, "utf-8");
	assert.ok(src.includes("evaluateAgtHarnessToolCall"));
	assert.ok(src.includes("registerHarnessSubagentSubmitTools"));
});

test("bridge uses governance extension not submit-only", () => {
	const src = readFileSync(
		join(root, ".pi", "extensions", "lib", "harness-subagents-bridge.ts"),
		"utf-8",
	);
	assert.ok(src.includes("harnessSubagentGovernanceExtensionPath"));
	assert.ok(src.includes("mintSubagentDelegation"));
});

test("policy-gate uses AGT when enabled", () => {
	const src = readFileSync(
		join(root, ".pi", "extensions", "policy-gate.ts"),
		"utf-8",
	);
	assert.ok(src.includes("isHarnessAgtPolicyEnabled"));
	assert.ok(src.includes("evaluateAgtHarnessToolCall"));
});

test("review-integrity remains separate extension", () => {
	const src = readFileSync(
		join(root, ".pi", "extensions", "review-integrity.ts"),
		"utf-8",
	);
	assert.ok(src.includes('pi.on("tool_call"'));
});
