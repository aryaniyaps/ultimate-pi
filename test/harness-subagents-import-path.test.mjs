import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vendoredIndex = join(
	root,
	".pi/extensions/lib/harness-subagents/vendored/index.ts",
);
const runCtxLib = join(root, ".pi/lib/harness-run-context.ts");

test("vendored harness-subagents resolves harness-run-context from package lib/", () => {
	const rel = "../../../../lib/harness-run-context.js";
	const resolved = resolve(dirname(vendoredIndex), rel.replace(/\.js$/, ".ts"));
	assert.equal(resolved, runCtxLib);
	assert.ok(existsSync(resolved), `missing ${resolved}`);
});
