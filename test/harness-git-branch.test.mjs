import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
	ensureHarnessGitBranch,
	harnessFeatureBranchName,
	isProtectedBranch,
} from "../.pi/lib/harness-git-branch.mjs";

test("isProtectedBranch matches globs", () => {
	assert.equal(isProtectedBranch("main", ["main", "master"]), true);
	assert.equal(isProtectedBranch("release/1.0", ["release/*"]), true);
	assert.equal(isProtectedBranch("feat/foo", ["main"]), false);
});

test("harnessFeatureBranchName slugifies run id", () => {
	assert.equal(
		harnessFeatureBranchName("harness-qa-live-123"),
		"harness/harness-qa-live-123",
	);
});

test("ensureHarnessGitBranch creates feature branch from main", async () => {
	const tmp = await mkdtemp(join(tmpdir(), "harness-git-branch-"));
	spawnSync("git", ["init"], { cwd: tmp });
	spawnSync("git", ["config", "user.email", "qa@test.local"], { cwd: tmp });
	spawnSync("git", ["config", "user.name", "QA"], { cwd: tmp });
	spawnSync("git", ["checkout", "-b", "main"], { cwd: tmp });
	await writeFile(join(tmp, "README.md"), "init\n", "utf8");
	spawnSync("git", ["add", "README.md"], { cwd: tmp });
	spawnSync("git", ["commit", "-m", "init"], { cwd: tmp });

	await mkdir(join(tmp, ".pi"), { recursive: true });
	await writeFile(
		join(tmp, ".pi", "auto-commit.json"),
		JSON.stringify({
			coAuthor: { login: "bot", email: "bot@test.local" },
			branch: {
				strategy: "auto-feature-branch",
				protected: ["main"],
			},
			message: {
				template: "{type}({scope}): {subject}",
				coAuthorTrailer: "Co-authored-by: {login} <{email}>",
			},
		}),
		"utf8",
	);

	const result = await ensureHarnessGitBranch({
		projectRoot: tmp,
		runId: "run-abc-123",
		upPkg: tmp,
	});
	assert.equal(result.ok, true);
	assert.equal(result.action, "create");
	assert.equal(result.target_branch, "harness/run-abc-123");
	assert.equal(result.new_branch, "harness/run-abc-123");
});

test("ensureHarnessGitBranch skips when not on protected branch", async () => {
	const tmp = await mkdtemp(join(tmpdir(), "harness-git-branch-"));
	spawnSync("git", ["init"], { cwd: tmp });
	spawnSync("git", ["config", "user.email", "qa@test.local"], { cwd: tmp });
	spawnSync("git", ["config", "user.name", "QA"], { cwd: tmp });
	spawnSync("git", ["checkout", "-b", "feat/existing"], { cwd: tmp });
	await writeFile(join(tmp, "seed.txt"), "x\n", "utf8");
	spawnSync("git", ["add", "seed.txt"], { cwd: tmp });
	spawnSync("git", ["commit", "-m", "seed"], { cwd: tmp });
	await mkdir(join(tmp, ".pi"), { recursive: true });
	await writeFile(
		join(tmp, ".pi", "auto-commit.json"),
		JSON.stringify({
			coAuthor: { login: "bot", email: "bot@test.local" },
			branch: { strategy: "auto-feature-branch", protected: ["main"] },
			message: {
				template: "{type}: {subject}",
				coAuthorTrailer: "Co-authored-by: {login} <{email}>",
			},
		}),
		"utf8",
	);

	const result = await ensureHarnessGitBranch({
		projectRoot: tmp,
		runId: "run-x",
		upPkg: tmp,
	});
	assert.equal(result.ok, true);
	assert.equal(result.reason, "not_on_protected_branch");
	assert.equal(result.action, "none");
});
