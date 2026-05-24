import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHarnessPolicyEngine } from "../.pi/lib/agt/policy-engine.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("package.json ships policies and agt lib", () => {
	const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
	const files = pkg.files ?? [];
	assert.ok(
		files.includes(".pi/harness/policies") ||
			files.some((f) => f.startsWith(".pi/harness/policies")),
		"policies must be in npm files[]",
	);
	assert.ok(files.includes(".pi/lib"), ".pi/lib must be in npm files[]");
});

test("policies load when package root is repo root (consumer simulation)", () => {
	const engine = createHarnessPolicyEngine(root);
	assert.ok(engine.listPolicies().includes("harness-defaults"));
});
