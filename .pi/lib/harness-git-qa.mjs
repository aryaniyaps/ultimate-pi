/**
 * Git QA smoke commit checks (plain ESM — safe from bash QA scripts).
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

export const SMOKE_FILE_REL = ".pi/harness/evals/smoke/E2E-LAST-RUN.txt";
const ISO_LINE_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.+-Z]+/m;

function runGitCapture(projectRoot, args) {
	const result = spawnSync("git", args, {
		cwd: projectRoot,
		encoding: "utf8",
		shell: false,
	});
	return {
		ok: (result.status ?? 1) === 0,
		stdout: (result.stdout ?? "").trim(),
	};
}

export async function smokeFileHasIsoLine(projectRoot) {
	try {
		const text = await readFile(join(projectRoot, SMOKE_FILE_REL), "utf-8");
		return ISO_LINE_RE.test(text);
	} catch {
		return false;
	}
}

/** True when smoke marker is committed at HEAD as a single-path harness-git-commit. */
export async function isHarnessGitQaCommitComplete(projectRoot) {
	if (!(await smokeFileHasIsoLine(projectRoot))) return false;
	const wt = runGitCapture(projectRoot, ["diff", "HEAD", "--", SMOKE_FILE_REL]);
	if (!wt.ok || wt.stdout) return false;
	const staged = runGitCapture(projectRoot, [
		"diff",
		"--cached",
		"HEAD",
		"--",
		SMOKE_FILE_REL,
	]);
	if (!staged.ok || staged.stdout) return false;
	const headFiles = runGitCapture(projectRoot, [
		"diff-tree",
		"--no-commit-id",
		"--name-only",
		"-r",
		"HEAD",
	]);
	if (!headFiles.ok) return false;
	const names = headFiles.stdout.split("\n").filter(Boolean);
	if (names.length !== 1 || names[0] !== SMOKE_FILE_REL) return false;
	const msg = runGitCapture(projectRoot, ["log", "-1", "--format=%B"]);
	return msg.ok && msg.stdout.includes("Co-authored-by:");
}
