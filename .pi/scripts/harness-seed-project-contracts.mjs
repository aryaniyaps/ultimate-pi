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

import { copyFile, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const UP_PKG = join(SCRIPT_DIR, "..", "..");
const SPEC_SRC = join(UP_PKG, ".pi", "harness", "specs");

const projectRoot = process.argv[2] || process.cwd();
const specDest = join(projectRoot, ".pi", "harness", "specs");

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
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
