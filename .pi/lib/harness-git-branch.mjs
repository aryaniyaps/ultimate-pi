/**
 * Intelligent git branch handling for harness runs (.pi/auto-commit.json branch.strategy).
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { stringify as stringifyYaml } from "yaml";
import { resolveAutoCommitConfig } from "./harness-auto-commit-config.mjs";

function runGit(args, cwd) {
	const result = spawnSync("git", args, {
		cwd,
		encoding: "utf8",
		shell: false,
	});
	return {
		ok: result.status === 0,
		status: result.status ?? 1,
		stdout: (result.stdout ?? "").trim(),
		stderr: (result.stderr ?? "").trim(),
	};
}

/** @param {string} pattern e.g. release/* */
function globToRegExp(pattern) {
	const escaped = pattern
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, ".*")
		.replace(/\?/g, ".");
	return new RegExp(`^${escaped}$`);
}

/**
 * @param {string} branch
 * @param {string[]} protectedPatterns
 */
export function isProtectedBranch(branch, protectedPatterns = []) {
	if (!branch || branch === "HEAD") return false;
	return protectedPatterns.some((p) => globToRegExp(String(p)).test(branch));
}

/** @param {string} runId */
export function harnessFeatureBranchName(runId) {
	const slug = String(runId ?? "run")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);
	return `harness/${slug || "run"}`;
}

/**
 * @param {string} projectRoot
 */
export function readCurrentBranch(projectRoot) {
	const r = runGit(["rev-parse", "--abbrev-ref", "HEAD"], projectRoot);
	if (!r.ok) return null;
	if (r.stdout === "HEAD") return "detached";
	return r.stdout;
}

/**
 * @param {object} opts
 * @param {string} opts.projectRoot
 * @param {string} opts.runId
 * @param {string} [opts.upPkg]
 * @param {boolean} [opts.dryRun]
 */
export async function ensureHarnessGitBranch(opts) {
	const projectRoot = opts.projectRoot;
	const runId = opts.runId;
	const dryRun = opts.dryRun === true;

	const gitDir = runGit(["rev-parse", "--git-dir"], projectRoot);
	if (!gitDir.ok) {
		return {
			ok: false,
			skipped: true,
			reason: "not_a_git_repo",
			current_branch: null,
			target_branch: null,
			action: "none",
		};
	}

	const upPkg = opts.upPkg ?? projectRoot;
	const config = await resolveAutoCommitConfig(projectRoot, upPkg);
	const strategy = String(config.branch?.strategy ?? "none").toLowerCase();
	const protectedPatterns = Array.isArray(config.branch?.protected)
		? config.branch.protected.map(String)
		: ["main", "master"];

	if (strategy === "none" || !strategy) {
		return {
			ok: true,
			skipped: true,
			reason: "strategy_none",
			current_branch: readCurrentBranch(projectRoot),
			target_branch: null,
			action: "none",
		};
	}

	if (strategy !== "auto-feature-branch") {
		return {
			ok: false,
			skipped: true,
			reason: `unsupported_strategy:${strategy}`,
			current_branch: readCurrentBranch(projectRoot),
			target_branch: null,
			action: "none",
		};
	}

	const current = readCurrentBranch(projectRoot);
	const target = harnessFeatureBranchName(runId);

	if (!current) {
		return {
			ok: false,
			skipped: true,
			reason: "cannot_read_branch",
			current_branch: null,
			target_branch: target,
			action: "none",
		};
	}

	if (current === target) {
		return {
			ok: true,
			skipped: false,
			reason: "already_on_target",
			current_branch: current,
			target_branch: target,
			action: "none",
		};
	}

	if (!isProtectedBranch(current, protectedPatterns)) {
		return {
			ok: true,
			skipped: false,
			reason: "not_on_protected_branch",
			current_branch: current,
			target_branch: target,
			action: "none",
		};
	}

	if (dryRun) {
		return {
			ok: true,
			skipped: false,
			reason: "dry_run",
			current_branch: current,
			target_branch: target,
			action: "would_checkout_or_create",
		};
	}

	const exists = runGit(
		["show-ref", "--verify", "--quiet", `refs/heads/${target}`],
		projectRoot,
	);
	let action = "checkout";
	if (!exists.ok) {
		const created = runGit(["checkout", "-b", target], projectRoot);
		if (!created.ok) {
			return {
				ok: false,
				skipped: false,
				reason: created.stderr || "checkout_create_failed",
				current_branch: current,
				target_branch: target,
				action: "failed",
			};
		}
		action = "create";
	} else {
		const checked = runGit(["checkout", target], projectRoot);
		if (!checked.ok) {
			return {
				ok: false,
				skipped: false,
				reason: checked.stderr || "checkout_failed",
				current_branch: current,
				target_branch: target,
				action: "failed",
			};
		}
	}

	return {
		ok: true,
		skipped: false,
		reason: action,
		current_branch: current,
		target_branch: target,
		action,
		new_branch: readCurrentBranch(projectRoot),
	};
}

/**
 * Persist branch workflow result under run artifacts.
 * @param {object} opts
 * @param {string} opts.runDir
 * @param {object} opts.result
 */
export async function writeGitWorkflowArtifact(opts) {
	const path = join(opts.runDir, "artifacts", "git-workflow.yaml");
	await mkdir(join(opts.runDir, "artifacts"), { recursive: true });
	const doc = {
		schema_version: "1.0.0",
		recorded_at: new Date().toISOString(),
		...opts.result,
	};
	await writeFile(path, stringifyYaml(doc), "utf-8");
	return path;
}
