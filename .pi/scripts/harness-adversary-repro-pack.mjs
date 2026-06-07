#!/usr/bin/env node
/**
 * Run safe adversary repro commands during review Phase 1.
 *
 * Usage:
 *   node harness-adversary-repro-pack.mjs --run-dir <path> [--project-root <root>]
 */

import { readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const SHELL_PREFIX = /^(npx|node|npm|tsx|sg|python3?)\b/i;

function parseArgs(argv) {
	const out = { runDir: null, projectRoot: null };
	for (let i = 2; i < argv.length; i++) {
		if (argv[i] === "--run-dir" && argv[i + 1]) out.runDir = argv[++i];
		else if (argv[i] === "--project-root" && argv[i + 1])
			out.projectRoot = argv[++i];
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

function extractCommands(adversary) {
	const cmds = [];
	if (Array.isArray(adversary?.repro_commands)) {
		for (const entry of adversary.repro_commands) {
			if (entry?.cmd && typeof entry.cmd === "string") {
				if (entry.safe_for_phase1 !== false) cmds.push(entry.cmd.trim());
			}
		}
	}
	if (Array.isArray(adversary?.repro_steps)) {
		for (const step of adversary.repro_steps) {
			if (typeof step !== "string") continue;
			for (const line of step.split("\n")) {
				const cmd = line.trim();
				if (cmd && SHELL_PREFIX.test(cmd) && !cmds.includes(cmd)) {
					cmds.push(cmd);
				}
			}
		}
	}
	return cmds;
}

async function isReportFresh(runDir, adversaryPath) {
	const adversaryMtime = (await stat(adversaryPath)).mtimeMs;
	const handoffPath = join(runDir, "handoff", "executor-summary.yaml");
	try {
		const handoffMtime = (await stat(handoffPath)).mtimeMs;
		return adversaryMtime >= handoffMtime - 1000;
	} catch {
		return true;
	}
}

export async function runHarnessAdversaryReproPack(opts) {
	const runDir = opts.runDir;
	const projectRoot = opts.projectRoot ?? join(runDir, "..", "..", "..");
	if (!runDir) return { ok: false, reason: "missing --run-dir", skipped: true };

	const adversaryPath = join(runDir, "artifacts", "adversary-report.yaml");
	let adversary;
	try {
		adversary = await readYaml(adversaryPath);
		if (!(await isReportFresh(runDir, adversaryPath))) {
			return {
				ok: false,
				reason: "adversary-report older than last executor handoff",
				skipped: true,
				adversary_repro: "stale",
			};
		}
	} catch {
		return {
			ok: true,
			skipped: true,
			adversary_repro: "skipped",
			reason: "no adversary-report.yaml",
		};
	}

	const commands = extractCommands(adversary);
	const results = [];
	for (const cmd of commands) {
		const r = spawnSync(cmd, { shell: true, cwd: projectRoot, encoding: "utf8" });
		results.push({
			cmd,
			exit_code: r.status ?? 1,
		});
	}

	const failed = results.some((r) => r.exit_code !== 0);
	const adversary_repro =
		commands.length === 0 ? "skipped" : failed ? "fail" : "pass";

	const benchmarkPath = join(runDir, "artifacts", "benchmark-log.yaml");
	const benchmark = (await readYaml(benchmarkPath)) ?? {
		schema_version: "1.0.0",
	};
	benchmark.adversary_repro = adversary_repro;
	benchmark.adversary_repro_results = results;
	await writeFile(benchmarkPath, stringifyYaml(benchmark));

	return {
		ok: adversary_repro !== "fail",
		adversary_repro,
		results,
		skipped: commands.length === 0,
	};
}

async function main() {
	const args = parseArgs(process.argv);
	const projectRoot =
		args.projectRoot ?? (args.runDir ? join(args.runDir, "..", "..", "..") : null);
	const result = await runHarnessAdversaryReproPack({
		runDir: args.runDir,
		projectRoot,
	});
	if (!result.ok && !result.skipped) {
		console.error(`harness-adversary-repro-pack: FAIL (${result.adversary_repro})`);
		process.exit(1);
	}
	console.log(
		`harness-adversary-repro-pack: ${result.adversary_repro ?? result.reason ?? "done"}`,
	);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
