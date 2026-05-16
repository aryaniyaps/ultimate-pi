#!/usr/bin/env node
/**
 * Copy harness JSON contracts (and specs README) from the installed ultimate-pi
 * package into the current project. External repos get `.pi/harness/specs/` before
 * graphify or /harness-plan so paths like plan-packet.schema.json resolve locally.
 *
 * Usage:
 *   node "$UP_PKG/.pi/scripts/harness-seed-project-contracts.mjs" [PROJECT_ROOT]
 *
 * PROJECT_ROOT defaults to process.cwd(). Package root is derived from this file
 * (the script always lives under the shipped ultimate-pi package).
 */

import { copyFile, mkdir, readdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const UP_PKG = join(SCRIPT_DIR, "..", "..");
const SPEC_SRC = join(UP_PKG, ".pi", "harness", "specs");
const SENTRUX_TEMPLATE = join(
	UP_PKG,
	".pi",
	"harness",
	"sentrux",
	"architecture.manifest.json",
);

const projectRoot = process.argv[2] || process.cwd();
const specDest = join(projectRoot, ".pi", "harness", "specs");
const sentruxDest = join(
	projectRoot,
	".pi",
	"harness",
	"sentrux",
	"architecture.manifest.json",
);

async function fileExists(path) {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

async function main() {
	const names = await readdir(SPEC_SRC);
	const toCopy = names.filter(
		(n) => n.endsWith(".schema.json") || n === "README.md",
	);
	if (toCopy.length === 0) {
		console.error(
			"harness-seed-project-contracts: no schema files under",
			SPEC_SRC,
		);
		process.exit(1);
	}
	await mkdir(specDest, { recursive: true });
	for (const name of toCopy) {
		await copyFile(join(SPEC_SRC, name), join(specDest, name));
	}
	console.log(
		`harness-seed-project-contracts: copied ${toCopy.length} file(s) -> ${specDest}`,
	);

	if (!(await fileExists(sentruxDest)) && (await fileExists(SENTRUX_TEMPLATE))) {
		await mkdir(dirname(sentruxDest), { recursive: true });
		await copyFile(SENTRUX_TEMPLATE, sentruxDest);
		console.log(
			`harness-seed-project-contracts: seeded Sentrux manifest -> ${sentruxDest} (run harness-sentrux-bootstrap.mjs to sync rules.toml)`,
		);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
