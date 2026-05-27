#!/usr/bin/env node
/**
 * Idempotent auto-commit config bootstrap for harness projects.
 *
 * Seeds PROJECT/.pi/auto-commit.json from the ultimate-pi package template when missing.
 *
 * Usage:
 *   node "$UP_PKG/.pi/scripts/harness-auto-commit-bootstrap.mjs" [PROJECT_ROOT] [--check]
 */

import { readFile, writeFile, mkdir, access, copyFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { validateAutoCommitConfig } from "../lib/harness-auto-commit-config.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const UP_PKG = join(SCRIPT_DIR, "..", "..");

const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const checkOnly = process.argv.includes("--check");
const PROJECT_ROOT = args[0] || process.cwd();
const CONFIG_PATH = join(PROJECT_ROOT, ".pi", "auto-commit.json");
const TEMPLATE_PATH = join(UP_PKG, ".pi", "auto-commit.json");

async function fileExists(path) {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

async function resolveScopeDefault(root) {
	const pkgPath = join(root, "package.json");
	if (await fileExists(pkgPath)) {
		try {
			const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
			if (typeof pkg.name === "string" && pkg.name.trim()) {
				return pkg.name.trim().replace(/^@/, "").split("/").pop() ?? pkg.name;
			}
		} catch {
			/* ignore */
		}
	}
	return basename(root) || "project";
}

async function main() {
	if (!(await fileExists(TEMPLATE_PATH))) {
		console.error(
			"harness-auto-commit-bootstrap: missing package template",
			TEMPLATE_PATH,
		);
		process.exit(1);
	}

	if (await fileExists(CONFIG_PATH)) {
		if (checkOnly) {
			const config = JSON.parse(await readFile(CONFIG_PATH, "utf-8"));
			validateAutoCommitConfig(config);
			console.log(`harness-auto-commit-bootstrap: ok ${CONFIG_PATH}`);
			return;
		}
		console.log(
			"harness-auto-commit-bootstrap: config present (edit .pi/auto-commit.json to customize)",
		);
		return;
	}

	if (checkOnly) {
		console.error(
			`harness-auto-commit-bootstrap: missing ${CONFIG_PATH} (run without --check to seed)`,
		);
		process.exit(1);
	}

	await mkdir(dirname(CONFIG_PATH), { recursive: true });
	await copyFile(TEMPLATE_PATH, CONFIG_PATH);
	const config = JSON.parse(await readFile(CONFIG_PATH, "utf-8"));
	const scope = await resolveScopeDefault(PROJECT_ROOT);
	if (config.message && typeof config.message === "object") {
		config.message.scopeDefault = scope;
	}
	validateAutoCommitConfig(config);
	await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, "\t")}\n`, "utf-8");
	console.log(
		`harness-auto-commit-bootstrap: seeded -> ${CONFIG_PATH} (message.scopeDefault: ${scope})`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
