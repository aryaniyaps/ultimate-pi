#!/usr/bin/env node
/**
 * Deterministic hygiene repairs (lint/format/stage) without executor steer.
 *
 * Usage:
 *   node harness-steer-hygiene.mjs --run-dir <path> [--project-root <root>]
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const DENYLIST = [
	/^\.env/i,
	/credentials/i,
	/^graphify-out\//,
	/^\.pi\/harness\/runs\//,
	/^node_modules\//,
];

function parseArgs(argv) {
	const out = { runDir: null, projectRoot: null };
	for (let i = 2; i < argv.length; i++) {
		if (argv[i] === "--run-dir" && argv[i + 1]) out.runDir = argv[++i];
		else if (argv[i] === "--project-root" && argv[i + 1])
			out.projectRoot = argv[++i];
	}
	return out;
}

function isDenied(relPath) {
	return DENYLIST.some((p) => p.test(relPath));
}

function runCmd(cmd, cwd) {
	const result = spawnSync(cmd, {
		shell: true,
		cwd,
		encoding: "utf8",
	});
	return {
		cmd,
		exit_code: result.status ?? 1,
		stdout: (result.stdout ?? "").slice(0, 2000),
		stderr: (result.stderr ?? "").slice(0, 2000),
	};
}

async function readYaml(path) {
	try {
		return parseYaml(await readFile(path, "utf8"));
	} catch {
		return null;
	}
}

function collectChangedFiles(projectRoot, runDir) {
	const fromGit = spawnSync("git diff --name-only HEAD", {
		shell: true,
		cwd: projectRoot,
		encoding: "utf8",
	});
	const files = new Set();
	if (fromGit.status === 0) {
		for (const line of (fromGit.stdout ?? "").split("\n")) {
			const t = line.trim();
			if (t && !isDenied(t)) files.add(t);
		}
	}
	const handoff = join(runDir, "handoff", "executor-summary.yaml");
	return { files: [...files], handoffPath: handoff };
}

export async function runHarnessSteerHygiene(opts) {
	const runDir = opts.runDir;
	const projectRoot = opts.projectRoot ?? join(runDir, "..", "..", "..");
	if (!runDir) return { ok: false, reason: "missing --run-dir" };

	const { files } = collectChangedFiles(projectRoot, runDir);
	const log = {
		schema_version: "1.0.0",
		commands: [],
		changed_files: files,
		outcome: "skipped",
	};

	if (files.length === 0) {
		log.outcome = "no_changed_files";
	} else {
		const biomeTargets = files.filter((f) => /\.(ts|tsx|js|mjs|json)$/.test(f));
		if (biomeTargets.length > 0) {
			const quoted = biomeTargets.map((f) => `"${f}"`).join(" ");
			log.commands.push(
				runCmd(`npx -y @biomejs/biome check --write ${quoted}`, projectRoot),
			);
		}
		const stageable = files.filter((f) => !isDenied(f));
		if (stageable.length > 0) {
			const quoted = stageable.map((f) => `"${f}"`).join(" ");
			log.commands.push(runCmd(`git add ${quoted}`, projectRoot));
		}
		const failed = log.commands.some((c) => c.exit_code !== 0);
		log.outcome = failed ? "fail" : "pass";
	}

	const outPath = join(runDir, "artifacts", "hygiene-repair-log.yaml");
	await mkdir(join(runDir, "artifacts"), { recursive: true });
	await writeFile(outPath, stringifyYaml(log));

	return { ok: log.outcome === "pass" || log.outcome === "no_changed_files", log };
}

async function main() {
	const args = parseArgs(process.argv);
	const projectRoot =
		args.projectRoot ?? (args.runDir ? join(args.runDir, "..", "..", "..") : null);
	const result = await runHarnessSteerHygiene({
		runDir: args.runDir,
		projectRoot,
	});
	if (!result.ok) {
		console.error(`harness-steer-hygiene: FAIL — ${result.log?.outcome ?? "error"}`);
		process.exit(1);
	}
	console.log(`harness-steer-hygiene: ${result.log?.outcome ?? "pass"}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
