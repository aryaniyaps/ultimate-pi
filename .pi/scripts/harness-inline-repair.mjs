#!/usr/bin/env node
/**
 * Burst/inline repair preflight — validates eval-pass + adversary block_merge before
 * /harness-steer --burst (deferred Phase 4b; no executor embedded in /harness-review).
 *
 * Usage:
 *   node harness-inline-repair.mjs --run-dir <path>
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

function parseArgs(argv) {
	const out = { runDir: null };
	for (let i = 2; i < argv.length; i++) {
		if (argv[i] === "--run-dir" && argv[i + 1]) out.runDir = argv[++i];
	}
	return out;
}

async function readYaml(path) {
	try {
		return parseYaml(await readFile(path, "utf8"));
	} catch {
		return null;
	}
}

export async function runHarnessInlineRepairPreflight(opts) {
	const runDir = opts.runDir;
	if (!runDir) return { ok: false, reason: "missing --run-dir" };

	const evalDoc = await readYaml(join(runDir, "artifacts", "eval-verdict.yaml"));
	const adversary = await readYaml(
		join(runDir, "artifacts", "adversary-report.yaml"),
	);
	const runCtx = await readYaml(join(runDir, "run-context.yaml"));

	const evalPass = (evalDoc?.status ?? "").toLowerCase() === "pass";
	const blockMerge = adversary?.block_merge === true;
	if (!evalPass || !blockMerge) {
		return {
			ok: false,
			reason: "inline/burst repair requires eval pass + adversary block_merge",
		};
	}
	if (runCtx?.inline_repair_attempted === true) {
		return { ok: false, reason: "inline_repair_attempted already set" };
	}
	const burstEnv = process.env.HARNESS_STEER_BURST?.trim();
	const burstOn = burstEnv === "1" || burstEnv?.toLowerCase() === "true";
	if (!burstOn) {
		return {
			ok: false,
			reason: "set HARNESS_STEER_BURST=1 to allow burst steer",
		};
	}
	return { ok: true, recommended: "/harness-steer --burst" };
}

async function main() {
	const args = parseArgs(process.argv);
	const result = await runHarnessInlineRepairPreflight(args);
	if (!result.ok) {
		console.error(`harness-inline-repair: ${result.reason}`);
		process.exit(1);
	}
	console.log(`harness-inline-repair: ok → ${result.recommended}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
