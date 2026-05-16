import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SYNC_SCRIPT = join(ROOT, ".pi", "scripts", "sentrux-rules-sync.mjs");
const BOOTSTRAP_SCRIPT = join(ROOT, ".pi", "scripts", "harness-sentrux-bootstrap.mjs");
const TEMPLATE_MANIFEST = join(
	ROOT,
	".pi",
	"harness",
	"sentrux",
	"architecture.manifest.json",
);

function runNode(script, args, cwd) {
	return new Promise((resolve, reject) => {
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

test("harness-sentrux-bootstrap seeds manifest and rules.toml", async () => {
	const tmp = await mkdtemp(join(tmpdir(), "sentrux-bootstrap-"));
	try {
		const { code, stdout } = await runNode(BOOTSTRAP_SCRIPT, [tmp], ROOT);
		assert.equal(code, 0, stdout);
		assert.match(stdout, /seeded manifest|manifest present/);

		const rules = await readFile(join(tmp, ".sentrux", "rules.toml"), "utf-8");
		assert.match(rules, /harness:managed:start/);
		assert.match(rules, /\[\[layers\]\]/);

		const manifest = JSON.parse(
			await readFile(
				join(tmp, ".pi", "harness", "sentrux", "architecture.manifest.json"),
				"utf-8",
			),
		);
		assert.ok(manifest.project);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

test("sentrux-rules-sync preserves custom TOML outside managed block", async () => {
	const tmp = await mkdtemp(join(tmpdir(), "sentrux-sync-"));
	try {
		await mkdir(join(tmp, ".pi", "harness", "sentrux"), { recursive: true });
		await mkdir(join(tmp, ".sentrux"), { recursive: true });
		await writeFile(
			join(tmp, ".pi", "harness", "sentrux", "architecture.manifest.json"),
			await readFile(TEMPLATE_MANIFEST, "utf-8"),
		);

		let { code, stdout } = await runNode(SYNC_SCRIPT, ["--force", tmp], ROOT);
		assert.equal(code, 0, stdout);

		const custom = "\n# user custom\n[[custom_rules]]\nname = \"keep-me\"\n";
		const rulesPath = join(tmp, ".sentrux", "rules.toml");
		const first = await readFile(rulesPath, "utf-8");
		await writeFile(rulesPath, `${first}${custom}`, "utf-8");

		({ code, stdout } = await runNode(SYNC_SCRIPT, ["--force", tmp], ROOT));
		assert.equal(code, 0, stdout);

		const merged = await readFile(rulesPath, "utf-8");
		assert.match(merged, /keep-me/);
		assert.match(merged, /harness:managed:start/);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

test("sentrux-rules-sync --check fails when manifest changes without sync", async () => {
	const tmp = await mkdtemp(join(tmpdir(), "sentrux-check-"));
	try {
		await mkdir(join(tmp, ".pi", "harness", "sentrux"), { recursive: true });
		const manifestPath = join(
			tmp,
			".pi",
			"harness",
			"sentrux",
			"architecture.manifest.json",
		);
		await writeFile(manifestPath, await readFile(TEMPLATE_MANIFEST, "utf-8"));

		let { code } = await runNode(SYNC_SCRIPT, ["--force", tmp], ROOT);
		assert.equal(code, 0);

		const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
		manifest.constraints = { ...manifest.constraints, max_cc: 99 };
		await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

		({ code } = await runNode(SYNC_SCRIPT, ["--check", tmp], ROOT));
		assert.notEqual(code, 0);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});
