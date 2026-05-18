#!/usr/bin/env node
/**
 * Regenerate or verify .pi/harness/agents.manifest.json from package agents.
 *
 * Usage:
 *   node .pi/scripts/harness-agents-manifest.mjs --write
 *   node .pi/scripts/harness-agents-manifest.mjs --check
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	isSafeAgentId,
	sha256Content,
	walkAgentsDir,
} from "../lib/harness-agent-discovery.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST_PATH = join(ROOT, ".pi", "harness", "agents.manifest.json");
const PACKAGE_AGENTS = join(ROOT, ".pi", "agents");

async function readPackageMeta() {
	const pkg = JSON.parse(
		await readFile(join(ROOT, "package.json"), "utf-8"),
	);
	return { name: pkg.name ?? "ultimate-pi", version: pkg.version ?? "0.0.0" };
}

function buildManifest(packageFiles, packageName, packageVersion) {
	const agents = {};
	for (const f of packageFiles.values()) {
		agents[f.id] = {
			path: `.pi/agents/${f.id}.md`,
			sha256: sha256Content(f.content),
		};
	}
	return {
		schema_version: "1.0.0",
		package: packageName,
		package_version: packageVersion,
		generated_at: new Date().toISOString(),
		agents,
	};
}

function getDriftReport(manifest, packageFiles) {
	const items = [];
	if (!manifest) {
		return { ok: false, items: [{ id: "*", kind: "missing_on_disk" }] };
	}
	for (const [id, file] of packageFiles) {
		const expected = manifest.agents[id];
		const actual = sha256Content(file.content);
		if (!expected) {
			items.push({ id, kind: "missing_in_manifest" });
			continue;
		}
		if (expected.sha256 !== actual) {
			items.push({ id, kind: "hash_mismatch", expected: expected.sha256, actual });
		}
	}
	for (const id of Object.keys(manifest.agents)) {
		if (!packageFiles.has(id)) {
			items.push({ id, kind: "missing_on_disk" });
		}
	}
	return { ok: items.length === 0, items };
}

async function loadPackageFiles() {
	const files = new Map();
	walkAgentsDir(PACKAGE_AGENTS, "package", files);
	for (const id of files.keys()) {
		if (!isSafeAgentId(id)) files.delete(id);
	}
	return files;
}

async function main() {
	const mode = process.argv.includes("--check") ? "check" : "write";
	const { name, version } = await readPackageMeta();
	const packageFiles = await loadPackageFiles();
	const built = buildManifest(packageFiles, name, version);

	if (mode === "write") {
		await writeFile(MANIFEST_PATH, `${JSON.stringify(built, null, 2)}\n`, "utf-8");
		console.log(
			`Wrote ${MANIFEST_PATH} (${Object.keys(built.agents).length} agents)`,
		);
		return;
	}

	let onDisk;
	try {
		onDisk = JSON.parse(await readFile(MANIFEST_PATH, "utf-8"));
	} catch {
		console.error("agents.manifest.json missing — run with --write");
		process.exit(1);
	}

	const drift = getDriftReport(onDisk, packageFiles);
	if (!drift.ok) {
		for (const item of drift.items) {
			console.error(`drift: ${item.id} (${item.kind})`);
		}
		process.exit(1);
	}

	if (onDisk.package_version !== version) {
		console.error(
			`package_version mismatch: manifest=${onDisk.package_version} package=${version}`,
		);
		process.exit(1);
	}

	console.log(`agents.manifest.json OK (${Object.keys(built.agents).length} agents)`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
