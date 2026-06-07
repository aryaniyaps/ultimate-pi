#!/usr/bin/env node
/**
 * Hard gate before spawning review evaluators — ensures benchmark-log is fresh.
 *
 * Usage:
 *   node harness-review-preflight.mjs --run-dir <path> [--steer-attempt N]
 */

import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

function parseArgs(argv) {
	const out = { runDir: null, steerAttempt: null };
	for (let i = 2; i < argv.length; i++) {
		if (argv[i] === "--run-dir" && argv[i + 1]) {
			out.runDir = argv[++i];
		} else if (argv[i] === "--steer-attempt" && argv[i + 1]) {
			out.steerAttempt = Number.parseInt(argv[++i], 10);
		}
	}
	return out;
}

async function readYaml(path) {
	try {
		const raw = await readFile(path, "utf8");
		return parseYaml(raw);
	} catch {
		return null;
	}
}

export async function runHarnessReviewPreflight(opts) {
	const runDir = opts.runDir;
	if (!runDir) {
		return { ok: false, reason: "missing --run-dir" };
	}
	const benchmarkPath = join(runDir, "artifacts", "benchmark-log.yaml");
	const handoffPath = join(runDir, "handoff", "executor-summary.yaml");
	const runCtxPath = join(runDir, "run-context.yaml");

	let benchmarkMtime = 0;
	let handoffMtime = 0;
	try {
		benchmarkMtime = (await stat(benchmarkPath)).mtimeMs;
	} catch {
		return {
			ok: false,
			reason:
				"benchmark-log.yaml missing — run Phase 1 (harness-verify + tests) before evaluators",
		};
	}
	try {
		handoffMtime = (await stat(handoffPath)).mtimeMs;
	} catch {
		/* execute may not have handoff in readonly resume */
	}

	const benchmark = await readYaml(benchmarkPath);
	if (!benchmark || typeof benchmark !== "object") {
		return { ok: false, reason: "benchmark-log.yaml unreadable or empty" };
	}
	if (!benchmark.harness_verify) {
		return {
			ok: false,
			reason: "benchmark-log.yaml missing harness_verify field",
		};
	}

	const runCtx = await readYaml(runCtxPath);
	const expectedAttempt =
		opts.steerAttempt ??
		(typeof runCtx?.steer_attempt === "number" ? runCtx.steer_attempt : 0);

	if (typeof benchmark.steer_attempt === "number") {
		if (benchmark.steer_attempt < expectedAttempt) {
			return {
				ok: false,
				reason: `benchmark-log stale: steer_attempt ${benchmark.steer_attempt} < expected ${expectedAttempt}`,
			};
		}
	}

	if (handoffMtime > 0 && benchmarkMtime < handoffMtime - 1000) {
		return {
			ok: false,
			reason:
				"benchmark-log older than executor handoff — re-run Phase 1 deterministic checks",
		};
	}

	return { ok: true, benchmark };
}

async function main() {
	const args = parseArgs(process.argv);
	const result = await runHarnessReviewPreflight(args);
	if (!result.ok) {
		console.error(`harness-review-preflight: FAIL — ${result.reason}`);
		process.exit(1);
	}
	console.log("harness-review-preflight: pass");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
