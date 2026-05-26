import assert from "node:assert/strict";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	getAgentPolicySpec,
	resolveExtensionBundlePaths,
} from "../.pi/lib/agents-policy.mjs";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

const spec = getAgentPolicySpec(root, root, "harness/running/executor");
assert.ok(spec, "executor policy spec");
assert.equal(spec.extensionBundle, "executor");
assert.equal(spec.extensionsOff, true);
assert.equal(spec.extensionsFull, false);
assert.equal(spec.noBuiltinTools, true);
assert.ok(spec.effectiveTools.includes("edit"));
assert.ok(spec.effectiveTools.includes("read"));

const paths = resolveExtensionBundlePaths(root, "executor");
assert.equal(paths.length, 3);
assert.ok(paths.some((p) => p.endsWith("harness-anchored-edit.ts")));
assert.ok(paths.some((p) => p.endsWith("subagent-governance.ts")));
assert.ok(paths.some((p) => p.endsWith("harness-lens.ts")));

const planner = getAgentPolicySpec(
	root,
	root,
	"harness/planning/decompose",
);
assert.ok(planner);
assert.equal(planner.extensionBundle, undefined);
assert.equal(planner.extensionsOff, true);
assert.equal(planner.noBuiltinTools, false);

console.log("harness-executor-extension-bundle.test.mjs OK");
