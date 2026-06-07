import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import {
	isHarnessGitQaCommitComplete,
	maybeHeadlessGitQaFinalizeOnRun,
} from "../.pi/lib/plan-headless-ux.ts";

const REPO_ROOT = join(import.meta.dirname, "..");
const SMOKE_REL = ".pi/harness/evals/smoke/E2E-LAST-RUN.txt";

async function initGitRepo(root) {
	spawnSync("git", ["init"], { cwd: root });
	spawnSync("git", ["config", "user.email", "qa@test.local"], { cwd: root });
	spawnSync("git", ["config", "user.name", "QA"], { cwd: root });
	spawnSync("git", ["checkout", "-b", "main"], { cwd: root });
	await writeFile(join(root, "README.md"), "init\n", "utf8");
	spawnSync("git", ["add", "README.md"], { cwd: root });
	spawnSync("git", ["commit", "-m", "init"], { cwd: root });
	await mkdir(join(root, ".pi"), { recursive: true });
	await writeFile(
		join(root, ".pi", "auto-commit.json"),
		JSON.stringify({
			coAuthor: { login: "bot", email: "bot@test.local" },
			message: {
				template: "{type}({scope}): {subject}",
				templateNoScope: "{type}: {subject}",
				coAuthorTrailer: "Co-authored-by: {login} <{email}>",
			},
			branch: { strategy: "none" },
		}),
		"utf8",
	);
}

test("maybeHeadlessGitQaFinalizeOnRun commits only smoke file with unrelated staged files", async () => {
	const prevSmoke = process.env.HARNESS_QA_SMOKE;
	const prevNi = process.env.HARNESS_NON_INTERACTIVE;
	process.env.HARNESS_QA_SMOKE = "1";
	process.env.HARNESS_NON_INTERACTIVE = "1";
	const root = await mkdtemp(join(tmpdir(), "harness-git-qa-"));
	try {
		await initGitRepo(root);
		await writeFile(join(root, "noise.txt"), "staged\n", "utf8");
		spawnSync("git", ["add", "noise.txt"], { cwd: root });

		const runCtx = {
			run_id: "qa-run-1",
			project_root: root,
			task_summary:
				"Harness git workflow: append ISO line and harness-git-commit only smoke file",
			plan_ready: true,
		};
		const runDir = join(root, ".pi", "harness", "runs", runCtx.run_id);
		await mkdir(join(runDir, "artifacts"), { recursive: true });
		await writeFile(join(runDir, "run-context.yaml"), `run_id: ${runCtx.run_id}\n`, "utf8");
		const done = await maybeHeadlessGitQaFinalizeOnRun({
			projectRoot: root,
			runCtx,
			command: "harness-run",
			upPkg: REPO_ROOT,
		});
		assert.equal(done, true);
		assert.equal(await isHarnessGitQaCommitComplete(root), true);
		const headFiles = spawnSync(
			"git",
			["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"],
			{ cwd: root, encoding: "utf8" },
		);
		assert.deepEqual(
			headFiles.stdout.trim().split("\n").filter(Boolean),
			[SMOKE_REL],
		);
		const stagedNoise = spawnSync(
			"git",
			["diff", "--cached", "--name-only"],
			{ cwd: root, encoding: "utf8" },
		);
		assert.match(stagedNoise.stdout, /noise\.txt/);
	} finally {
		if (prevSmoke === undefined) delete process.env.HARNESS_QA_SMOKE;
		else process.env.HARNESS_QA_SMOKE = prevSmoke;
		if (prevNi === undefined) delete process.env.HARNESS_NON_INTERACTIVE;
		else process.env.HARNESS_NON_INTERACTIVE = prevNi;
	}
});

test("maybeHeadlessGitQaFinalizeOnRun writes git-workflow when commit already at HEAD", async () => {
	const prevSmoke = process.env.HARNESS_QA_SMOKE;
	const prevNi = process.env.HARNESS_NON_INTERACTIVE;
	process.env.HARNESS_QA_SMOKE = "1";
	process.env.HARNESS_NON_INTERACTIVE = "1";
	const root = await mkdtemp(join(tmpdir(), "harness-git-qa-"));
	try {
		await initGitRepo(root);
		const runCtx = {
			run_id: "qa-run-2",
			project_root: root,
			task_summary:
				"Harness git workflow: append ISO line and harness-git-commit only smoke file",
			plan_ready: true,
		};
		const runDir = join(root, ".pi", "harness", "runs", runCtx.run_id);
		await mkdir(join(runDir, "artifacts"), { recursive: true });
		await writeFile(join(runDir, "run-context.yaml"), `run_id: ${runCtx.run_id}\n`, "utf8");
		assert.equal(
			await maybeHeadlessGitQaFinalizeOnRun({
				projectRoot: root,
				runCtx,
				command: "harness-auto",
				upPkg: REPO_ROOT,
			}),
			true,
		);
		const artifact = join(runDir, "artifacts", "git-workflow.yaml");
		await access(artifact, constants.R_OK);
		assert.equal(
			await maybeHeadlessGitQaFinalizeOnRun({
				projectRoot: root,
				runCtx,
				command: "harness-auto",
				upPkg: REPO_ROOT,
			}),
			true,
		);
		assert.equal(await isHarnessGitQaCommitComplete(root), true);
	} finally {
		if (prevSmoke === undefined) delete process.env.HARNESS_QA_SMOKE;
		else process.env.HARNESS_QA_SMOKE = prevSmoke;
		if (prevNi === undefined) delete process.env.HARNESS_NON_INTERACTIVE;
		else process.env.HARNESS_NON_INTERACTIVE = prevNi;
	}
});
