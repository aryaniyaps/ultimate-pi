#!/usr/bin/env node
/**
 * Idempotent ls-lint naming bootstrap for harness projects.
 *
 * 1. Seeds `.pi/harness/ls-lint/naming.manifest.json` from the package template when missing
 * 2. Personalizes `project` on first seed from target package.json / directory name
 * 3. Runs `ls-lint-rules-sync.mjs` (merge-safe; preserves custom YAML outside managed markers)
 *
 * Usage:
 *   node "$UP_PKG/.pi/scripts/harness-ls-lint-bootstrap.mjs" [PROJECT_ROOT] [--force] [--check]
 */

import { readFile, writeFile, mkdir, access, copyFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const UP_PKG = join(SCRIPT_DIR, "..", "..");

const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const flags = process.argv.slice(2).filter((a) => a.startsWith("-"));
const force = flags.includes("--force");
const checkOnly = flags.includes("--check");

const PROJECT_ROOT = args[0] || process.cwd();
const MANIFEST = join(
	PROJECT_ROOT,
	".pi",
	"harness",
	"ls-lint",
	"naming.manifest.json",
);
const MANIFEST_TEMPLATE = join(
	UP_PKG,
	".pi",
	"harness",
	"ls-lint",
	"naming.manifest.json",
);
const SYNC_SCRIPT = join(SCRIPT_DIR, "ls-lint-rules-sync.mjs");

async function fileExists(path) {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

async function resolveProjectName(root) {
	const pkgPath = join(root, "package.json");
	if (await fileExists(pkgPath)) {
		try {
			const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
			if (typeof pkg.name === "string" && pkg.name.trim()) {
				return pkg.name.trim();
			}
		} catch {
			/* ignore */
		}
	}
	return basename(root) || "project";
}

async function seedManifestIfMissing() {
	if (await fileExists(MANIFEST)) {
		return { seeded: false };
	}
	if (!(await fileExists(MANIFEST_TEMPLATE))) {
		console.error(
			"harness-ls-lint-bootstrap: missing package template",
			MANIFEST_TEMPLATE,
		);
		process.exit(1);
	}
	await mkdir(dirname(MANIFEST), { recursive: true });
	await copyFile(MANIFEST_TEMPLATE, MANIFEST);
	const projectName = await resolveProjectName(PROJECT_ROOT);
	const manifest = JSON.parse(await readFile(MANIFEST, "utf-8"));
	manifest.project = projectName;
	await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
	console.log(
		`harness-ls-lint-bootstrap: seeded manifest -> ${MANIFEST} (project: ${projectName})`,
	);
	return { seeded: true, projectName };
}

function runSync(extraArgs) {
	return new Promise((resolve) => {
		const child = spawn(
			process.execPath,
			[SYNC_SCRIPT, ...extraArgs, PROJECT_ROOT],
			{
				cwd: PROJECT_ROOT,
				stdio: ["ignore", "pipe", "pipe"],
				env: process.env,
			},
		);
		let out = "";
		child.stdout?.on("data", (d) => {
			out += d.toString();
		});
		child.stderr?.on("data", (d) => {
			out += d.toString();
		});
		child.on("close", (code) => resolve({ code: code ?? 1, out: out.trim() }));
		child.on("error", (err) =>
			resolve({ code: 1, out: String(err.message) }),
		);
	});
}

async function main() {
	const { seeded } = await seedManifestIfMissing();
	if (!seeded) {
		console.log(
			"harness-ls-lint-bootstrap: manifest present (edit naming rules there, then re-run with --force)",
		);
	}

	const syncArgs = [];
	if (checkOnly) syncArgs.push("--check");
	else if (force) syncArgs.push("--force");

	const { code, out } = await runSync(syncArgs);
	if (out) console.log(out);
	if (code !== 0) process.exit(code);

	if (!checkOnly && !force) {
		console.log(
			'harness-ls-lint-bootstrap: done (idempotent). After manifest edits: node "$UP_PKG/.pi/scripts/harness-ls-lint-bootstrap.mjs" --force',
		);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
