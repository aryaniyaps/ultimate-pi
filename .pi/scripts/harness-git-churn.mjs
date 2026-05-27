#!/usr/bin/env node
/**
 * Optional git churn map (path → commit count) for Sentrux hotspot scoring.
 *
 * Usage:
 *   node harness-git-churn.mjs [--root <PROJECT_ROOT>] [--days 14]
 */

import { spawn } from "node:child_process";
import { resolveSentruxProjectRoot, takeRootArg } from "../lib/harness-sentrux-root.mjs";

function runGit(args, cwd) {
	return new Promise((resolve, reject) => {
		const child = spawn("git", args, { cwd, env: process.env });
		let stdout = "";
		let stderr = "";
		child.stdout?.on("data", (c) => {
			stdout += c.toString();
		});
		child.stderr?.on("data", (c) => {
			stderr += c.toString();
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code !== 0) {
				reject(new Error(stderr.trim() || `git exit ${code}`));
				return;
			}
			resolve(stdout);
		});
	});
}

/**
 * @param {string} projectRoot
 * @param {{ days?: number }} opts
 * @returns {Promise<Record<string, number>>}
 */
export async function loadGitChurn(projectRoot, opts = {}) {
	const days = opts.days ?? 14;
	const since = `${days} days ago`;
	const stdout = await runGit(
		[
			"log",
			`--since=${since}`,
			"--name-only",
			"--pretty=format:",
		],
		projectRoot,
	);
	const counts = {};
	for (const line of stdout.split(/\r?\n/)) {
		const path = line.trim();
		if (!path || path.startsWith(".")) continue;
		counts[path] = (counts[path] || 0) + 1;
	}
	return counts;
}

async function main() {
	const { args, explicitRoot } = takeRootArg(process.argv.slice(2));
	let days = 14;
	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--days") days = Number.parseInt(args[++i] || "14", 10);
	}
	const root = await resolveSentruxProjectRoot(explicitRoot);
	const map = await loadGitChurn(root, { days });
	process.stdout.write(`${JSON.stringify(map, null, 2)}\n`);
}

const isMain = process.argv[1]?.endsWith("harness-git-churn.mjs");
if (isMain) {
	main().catch((err) => {
		console.error(err.message || err);
		process.exit(1);
	});
}
