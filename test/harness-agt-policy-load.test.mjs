import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	doctorHarnessPolicies,
	createHarnessPolicyEngine,
} from "../.pi/lib/agt/policy-engine.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("AGT policy doctor passes for repo policies", () => {
	const doc = doctorHarnessPolicies(root);
	assert.equal(doc.ok, true, doc.errors.join("; "));
	assert.ok(doc.loaded.length >= 7);
});

test("PolicyEngine loads all harness YAML policies", () => {
	const engine = createHarnessPolicyEngine(root);
	const names = engine.listPolicies();
	assert.ok(names.length >= 7);
});
