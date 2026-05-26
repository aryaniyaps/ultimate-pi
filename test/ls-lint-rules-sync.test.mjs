import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SYNC_SCRIPT = join(ROOT, ".pi", "scripts", "ls-lint-rules-sync.mjs");
const BOOTSTRAP_SCRIPT = join(ROOT, ".pi", "scripts", "harness-ls-lint-bootstrap.mjs");
const CLI_SCRIPT = join(ROOT, ".pi", "scripts", "harness-ls-lint-cli.mjs");
const TEMPLATE_MANIFEST = join(
	ROOT,
	".pi",
	"harness",
	"ls-lint",
	"naming.manifest.json",
);

function runNode(script, args, cwd) {
	return new Promise((resolve) => {
		const child = spawn(process.execPath, [script, ...args], {
			cwd,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (d) => {
			stdout += d.toString();
		});
		child.stderr.on("data", (d) => {
			stderr += d.toString();
		});
		child.on("close", (code) => {
			resolve({ code: code ?? 1, stdout, stderr });
		});
	});
}

test("harness-ls-lint-bootstrap seeds manifest and .ls-lint.yml", async () => {
	const tmp = await mkdtemp(join(tmpdir(), "ls-lint-bootstrap-"));
	try {
		const { code, stdout } = await runNode(BOOTSTRAP_SCRIPT, [tmp], ROOT);
		assert.equal(code, 0, stdout);

		const yml = await readFile(join(tmp, ".ls-lint.yml"), "utf-8");
		assert.match(yml, /harness:managed:start/);
		assert.match(yml, /ls:/);

		const manifest = JSON.parse(
			await readFile(
				join(tmp, ".pi", "harness", "ls-lint", "naming.manifest.json"),
				"utf-8",
			),
		);
		assert.ok(manifest.project);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

test("ls-lint-rules-sync preserves custom YAML outside managed block", async () => {
	const tmp = await mkdtemp(join(tmpdir(), "ls-lint-sync-"));
	try {
		await mkdir(join(tmp, ".pi", "harness", "ls-lint"), { recursive: true });
		await writeFile(
			join(tmp, ".pi", "harness", "ls-lint", "naming.manifest.json"),
			await readFile(TEMPLATE_MANIFEST, "utf-8"),
		);

		let { code, stdout } = await runNode(SYNC_SCRIPT, ["--force", tmp], ROOT);
		assert.equal(code, 0, stdout);

		const custom = "\n# user custom\nls:\n  .custom: kebab-case\n";
		const rulesPath = join(tmp, ".ls-lint.yml");
		const first = await readFile(rulesPath, "utf-8");
		await writeFile(rulesPath, `${first}${custom}`, "utf-8");

		({ code, stdout } = await runNode(SYNC_SCRIPT, ["--force", tmp], ROOT));
		assert.equal(code, 0, stdout);

		const merged = await readFile(rulesPath, "utf-8");
		assert.match(merged, /\.custom: kebab-case/);
		assert.match(merged, /harness:managed:start/);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

test("harness-ls-lint-cli resolves project root from harness run subdirectories", async () => {
	const tmp = await mkdtemp(join(tmpdir(), "ls-lint-cli-root-"));
	try {
		await mkdir(join(tmp, ".pi", "harness", "runs", "run-1"), {
			recursive: true,
		});
		await writeFile(join(tmp, ".ls-lint.yml"), "ls:\n  .dir: kebab-case\n");

		const { code, stdout, stderr } = await runNode(
			CLI_SCRIPT,
			["--print-root"],
			join(tmp, ".pi", "harness", "runs", "run-1"),
		);
		assert.equal(code, 0, stderr || stdout);
		assert.equal(stdout.trim(), tmp);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

test("ls-lint-rules-sync --check fails when manifest changes without sync", async () => {
	const tmp = await mkdtemp(join(tmpdir(), "ls-lint-check-"));
	try {
		await mkdir(join(tmp, ".pi", "harness", "ls-lint"), { recursive: true });
		const manifestPath = join(
			tmp,
			".pi",
			"harness",
			"ls-lint",
			"naming.manifest.json",
		);
		await writeFile(manifestPath, await readFile(TEMPLATE_MANIFEST, "utf-8"));

		let { code } = await runNode(SYNC_SCRIPT, ["--force", tmp], ROOT);
		assert.equal(code, 0);

		const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
		manifest.ignores = [...(manifest.ignores ?? []), "extra-ignore-dir"];
		await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

		({ code } = await runNode(SYNC_SCRIPT, ["--check", tmp], ROOT));
		assert.notEqual(code, 0);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});
