#!/usr/bin/env node
/** Regenerate .pi/harness/web-heuristic-angles.json from shipped Python defaults. */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "harness");
const out = join(root, "web-heuristic-angles.json");
const py = join(dirname(fileURLToPath(import.meta.url)), "harness_web", "heuristic_angles_shipped.py");
const json = execFileSync(
	"python3",
	[
		"-c",
		`import json, importlib.util
spec = importlib.util.spec_from_file_location("shipped", ${JSON.stringify(py)})
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
print(json.dumps(mod.SHIPPED_HEURISTIC_ANGLES, indent=2))`,
	],
	{ encoding: "utf-8" },
);
writeFileSync(out, `${json}\n`, "utf-8");
console.log(`wrote ${out}`);
