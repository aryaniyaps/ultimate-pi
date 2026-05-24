#!/usr/bin/env npx tsx
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { doctorHarnessPolicies } from "../lib/agt/policy-engine.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const doc = doctorHarnessPolicies(ROOT);
if (!doc.ok) {
	console.error("AGT policy doctor failed:");
	for (const e of doc.errors) console.error(`  - ${e}`);
	process.exit(1);
}
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8")) as {
	files?: string[];
};
const files = pkg.files ?? [];
if (
	!files.some(
		(f: string) =>
			f === ".pi/harness/policies" || f.startsWith(".pi/harness/policies/"),
	)
) {
	console.error("package.json files[] missing .pi/harness/policies");
	process.exit(1);
}
if (
	!files.includes(".pi/lib") &&
	!files.some((f) => f.startsWith(".pi/lib/"))
) {
	console.error("package.json files[] missing .pi/lib (ships .pi/lib/agt)");
	process.exit(1);
}
console.log(
	`AGT doctor OK (${doc.loaded.length} policies at ${doc.policyDir})`,
);
