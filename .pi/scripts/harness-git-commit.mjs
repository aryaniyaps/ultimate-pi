#!/usr/bin/env node
/**
 * Git commit with merged .pi/auto-commit.json message format + co-author trailer.
 *
 * Usage:
 *   node "$UP_PKG/.pi/scripts/harness-git-commit.mjs" \
 *     --subject "..." [--type fix] [--scope app] [--body "..."] \
 *     [--message "full body"] [--amend] [--print-message] [--root DIR] \
 *     [--dry-run] [--no-verify] [--signoff]
 *
 * Does not run git add — stage files first.
 */

import { writeFile, unlink, mkdtemp, access, constants } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import {
	buildFullCommitMessage,
	resolveAutoCommitConfig,
} from "../lib/harness-auto-commit-config.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const UP_PKG = join(SCRIPT_DIR, "..", "..");

function parseArgs(argv) {
	const flags = new Set();
	const opts = {};
	const positional = [];
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--dry-run") flags.add("dry-run");
		else if (a === "--print-message") flags.add("print-message");
		else if (a === "--amend") flags.add("amend");
		else if (a === "--no-verify") flags.add("no-verify");
		else if (a === "--signoff") flags.add("signoff");
		else if (a === "--subject" && argv[i + 1]) opts.subject = argv[++i];
		else if (a === "--type" && argv[i + 1]) opts.type = argv[++i];
		else if (a === "--scope" && argv[i + 1]) opts.scope = argv[++i];
		else if (a === "--body" && argv[i + 1]) opts.body = argv[++i];
		else if (a === "--message" && argv[i + 1]) opts.message = argv[++i];
		else if (a === "--root" && argv[i + 1]) opts.root = argv[++i];
		else if (a === "--only-path" && argv[i + 1]) {
			opts.onlyPaths ??= [];
			opts.onlyPaths.push(argv[++i]);
		}
		else if (a.startsWith("-")) {
			console.error(`harness-git-commit: unknown flag ${a}`);
			process.exit(1);
		} else positional.push(a);
	}
	return { flags, opts, positional };
}

function runGit(args, cwd) {
	return new Promise((resolve, reject) => {
		const child = spawn("git", args, {
			cwd,
			env: process.env,
			shell: false,
			stdio: ["ignore", "pipe", "pipe"],
		});
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
				reject(new Error(stderr.trim() || stdout.trim() || `git exit ${code}`));
				return;
			}
			resolve(stdout);
		});
	});
}

async function fileExists(path) {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

async function resolveUpPkg() {
	const resolver = join(SCRIPT_DIR, "harness-resolve-up-pkg.mjs");
	if (await fileExists(resolver)) {
		const { spawnSync } = await import("node:child_process");
		const r = spawnSync(process.execPath, [resolver], {
			encoding: "utf-8",
			shell: false,
		});
		if (r.status === 0 && r.stdout?.trim()) {
			return r.stdout.trim();
		}
	}
	return UP_PKG;
}

async function main() {
	const { flags, opts, positional } = parseArgs(process.argv.slice(2));
	const projectRoot = opts.root ?? positional[0] ?? process.cwd();
	const upPkg = await resolveUpPkg();

	const projectConfigPath = join(projectRoot, ".pi", "auto-commit.json");
	if (!(await fileExists(projectConfigPath))) {
		console.warn(
			"harness-git-commit: hint — run node \"$UP_PKG/.pi/scripts/harness-auto-commit-bootstrap.mjs\" to seed .pi/auto-commit.json",
		);
	}

	const config = await resolveAutoCommitConfig(projectRoot, upPkg);
	if (config.dryRun === true && !flags.has("dry-run")) {
		console.warn(
			"harness-git-commit: warning — dryRun is true in config; pass --dry-run explicitly to preview without committing",
		);
	}

	const dryRun =
		flags.has("dry-run") ||
		process.env.HARNESS_GIT_COMMIT_DRY_RUN === "1";

	let input = {
		type: opts.type,
		scope: opts.scope,
		subject: opts.subject,
		body: opts.body,
		message: opts.message,
	};

	if (flags.has("amend") && !input.message) {
		const prior = await runGit(
			["log", "-1", "--format=%B"],
			projectRoot,
		).catch(() => "");
		if (prior.trim()) {
			input = { message: prior.trim() };
		}
	}

	const fullMessage = buildFullCommitMessage(config, input);

	if (flags.has("print-message") || dryRun) {
		process.stdout.write(`${fullMessage}\n`);
		return;
	}

	await runGit(["rev-parse", "--git-dir"], projectRoot);

	const tmpDir = await mkdtemp(join(tmpdir(), "harness-git-commit-"));
	const msgFile = join(tmpDir, "COMMIT_EDITMSG");
	try {
		await writeFile(msgFile, `${fullMessage}\n`, "utf-8");
		const gitArgs = ["commit", "-F", msgFile];
		if (flags.has("amend")) gitArgs.push("--amend");
		if (flags.has("no-verify")) gitArgs.push("--no-verify");
		if (flags.has("signoff")) gitArgs.push("--signoff");
		if (Array.isArray(opts.onlyPaths) && opts.onlyPaths.length > 0) {
			for (const relPath of opts.onlyPaths) {
				await runGit(["add", "--", relPath], projectRoot);
			}
			gitArgs.push("--only", "--", ...opts.onlyPaths);
		}

		const out = await runGit(gitArgs, projectRoot);
		if (out.trim()) process.stdout.write(out);
		console.log("harness-git-commit: committed with co-author trailer");
	} finally {
		await unlink(msgFile).catch(() => {});
	}
}

main().catch((err) => {
	console.error(`harness-git-commit: ${err.message}`);
	process.exit(1);
});
