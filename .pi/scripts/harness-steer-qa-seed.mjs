#!/usr/bin/env node
/**
 * Seed deterministic steer-loop fixtures for headless QA (hygiene gap → /harness-steer).
 *
 * Usage:
 *   node harness-steer-qa-seed.mjs --run-dir <path> [--project-root <root>]
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { stringify as stringifyYaml } from "yaml";

function parseArgs(argv) {
	const out = { runDir: null, projectRoot: null };
	for (let i = 2; i < argv.length; i++) {
		if (argv[i] === "--run-dir" && argv[i + 1]) out.runDir = argv[++i];
		else if (argv[i] === "--project-root" && argv[i + 1])
			out.projectRoot = argv[++i];
	}
	return out;
}

async function readRunId(runDir) {
	try {
		const raw = await readFile(join(runDir, "run-context.yaml"), "utf8");
		const m = /run_id:\s*['"]?([^\s'"]+)/.exec(raw);
		return m?.[1] ?? null;
	} catch {
		return null;
	}
}

export async function seedSteerQaFixtures(opts) {
	const runDir = opts.runDir;
	if (!runDir) return { ok: false, reason: "missing --run-dir" };
	const runId = opts.runId ?? (await readRunId(runDir));
	if (!runId) return { ok: false, reason: "run_id unknown" };

	const artifacts = join(runDir, "artifacts");
	await mkdir(artifacts, { recursive: true });

	const reviewOutcome = {
		schema_version: "1.0.0",
		run_id: runId,
		status: "fail",
		remediation_class: "implementation_gap",
		recommended_next: "/harness-steer",
		gap_kind: "hygiene",
		eval_status: "fail",
		adversary_status: "proceed",
		steer_attempt: 0,
		review_tier: "full",
		source_artifacts: {
			eval_verdict: "artifacts/eval-verdict.yaml",
			benchmark_log: "artifacts/benchmark-log.yaml",
		},
		seed_source: "harness-steer-qa-seed",
	};

	const repairBrief = {
		schema_version: "1.0.0",
		run_id: runId,
		steer_attempt: 1,
		remediation_class: "implementation_gap",
		gap_kind: "hygiene",
		source_artifacts: {
			review_outcome: "artifacts/review-outcome.yaml",
			eval_verdict: "artifacts/eval-verdict.yaml",
		},
		fix_directives: [
			"Run harness-steer-hygiene to stage allowed changed files only.",
		],
		verification_commands: [
			'node "$UP_PKG/.pi/scripts/harness-ls-lint-cli.mjs"',
		],
		must_pass_before_handoff: false,
		seed_source: "harness-steer-qa-seed",
	};

	const evalVerdict = {
		schema_version: "1.0.0",
		run_id: runId,
		status: "fail",
		recommended_action: "steer",
		failed_checks: ["ls_lint_format"],
		seed_source: "harness-steer-qa-seed",
	};

	const steerState = {
		schema_version: "1.0.0",
		run_id: runId,
		attempt: 0,
		max_attempts: 3,
		active: false,
		hygiene_repairs: 0,
		seed_source: "harness-steer-qa-seed",
	};

	await writeFile(
		join(artifacts, "review-outcome.yaml"),
		stringifyYaml(reviewOutcome),
		"utf8",
	);
	await writeFile(
		join(artifacts, "repair-brief.yaml"),
		stringifyYaml(repairBrief),
		"utf8",
	);
	await writeFile(
		join(artifacts, "eval-verdict.yaml"),
		stringifyYaml(evalVerdict),
		"utf8",
	);
	await writeFile(
		join(artifacts, "steer-state.yaml"),
		stringifyYaml(steerState),
		"utf8",
	);

	return { ok: true, run_id: runId, artifacts_dir: artifacts };
}

async function main() {
	const args = parseArgs(process.argv);
	const runDir = args.runDir;
	if (!runDir) {
		console.error("harness-steer-qa-seed: --run-dir is required");
		process.exit(1);
	}
	const out = await seedSteerQaFixtures({ runDir: args.runDir });
	console.log(JSON.stringify(out, null, 2));
	if (!out.ok) process.exit(1);
}

const isMain = process.argv[1]?.endsWith("harness-steer-qa-seed.mjs");
if (isMain) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
