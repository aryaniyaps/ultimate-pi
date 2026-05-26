#!/usr/bin/env node
/**
 * Smoke test for native anchored edit apply (no Pi oldText shim).
 */
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(join(root, "package.json"));

const { applyAnchoredEditsToFile } = await import(
	join(root, ".pi/lib/harness-anchored-edit/apply-anchored-edits.ts")
);
const { hashLinesStateful } = await import(
	join(root, ".pi/lib/harness-anchored-edit/anchor-state.ts")
);

const dir = mkdtempSync(join(tmpdir(), "anchored-smoke-"));
const file = join(dir, "t.ts");
writeFileSync(file, "line one\nline two\n");
const plain = readFileSync(file, "utf8");
const hashed = hashLinesStateful(file, plain, "smoke");
const line2 = hashed.split("\n").find((l) => l.includes("line two"));
if (!line2) {
	console.error("smoke FAIL: no anchor line");
	process.exit(1);
}
const result = await applyAnchoredEditsToFile(
	file,
	[{ anchor: line2, text: "line TWO", edit_type: "replace" }],
	"smoke",
);
if (!result.ok) {
	console.error("smoke FAIL:", result.error);
	process.exit(1);
}
const out = readFileSync(file, "utf8");
if (!out.includes("line TWO")) {
	console.error("smoke FAIL: file not updated:", out);
	process.exit(1);
}
console.log("harness-anchored-edit-smoke OK");
