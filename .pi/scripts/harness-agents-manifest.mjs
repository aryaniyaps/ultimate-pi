#!/usr/bin/env node
/**
 * Regenerate or verify .pi/harness/agents.manifest.json from package agents.
 *
 * Usage:
 *   node .pi/scripts/harness-agents-manifest.mjs --write
 *   node .pi/scripts/harness-agents-manifest.mjs --check
 */

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	isSafeAgentId,
	sha256Content,
	walkAgentsDir,
} from "../lib/harness-agent-discovery.mjs";
import {
	loadAgentsPolicyMerged,
	packageAgentsPolicyPath,
} from "../lib/agents-policy.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST_PATH = join(ROOT, ".pi", "harness", "agents.manifest.json");
const PACKAGE_AGENTS = join(ROOT, ".pi", "agents");

async function readPackageMeta() {
	const pkg = JSON.parse(
		await readFile(join(ROOT, "package.json"), "utf-8"),
	);
	return { name: pkg.name ?? "ultimate-pi", version: pkg.version ?? "0.0.0" };
}

async function buildManifest(packageFiles, packageName, packageVersion) {
	const agents = {};
	for (const f of packageFiles.values()) {
		agents[f.id] = {
			path: `.pi/agents/${f.id}.md`,
			sha256: sha256Content(f.content),
		};
	}
	const policyPath = packageAgentsPolicyPath(ROOT);
	let policy_sha256;
	if (existsSync(policyPath)) {
		policy_sha256 = sha256Content(await readFile(policyPath, "utf-8"));
	}
	return {
		schema_version: "1.0.0",
		package: packageName,
		package_version: packageVersion,
		generated_at: new Date().toISOString(),
		...(policy_sha256 ? { policy_sha256 } : {}),
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

function frontmatterHasToolLists(content) {
	const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!m) return false;
	return /^tools:/m.test(m[1]) || /^disallowed_tools:/m.test(m[1]);
}

function verifyAgentsPolicy(packageFiles) {
	const items = [];
	const policyPath = packageAgentsPolicyPath(ROOT);
	if (!existsSync(policyPath)) {
		return { ok: false, items: [{ id: "*", kind: "missing_agents_policy_yaml" }] };
	}
	const merged = loadAgentsPolicyMerged(ROOT, ROOT);
	for (const [id, file] of packageFiles) {
		if (!id.startsWith("harness/")) continue;
		if (frontmatterHasToolLists(file.content)) {
			items.push({ id, kind: "frontmatter_tools" });
		}
		if (!merged.agents.has(id)) {
			items.push({ id, kind: "missing_policy_entry" });
		}
	}
	for (const id of merged.agents.keys()) {
		if (!id.startsWith("harness/")) continue;
		if (!packageFiles.has(id)) {
			items.push({ id, kind: "orphan_policy_entry" });
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
	const built = await buildManifest(packageFiles, name, version);

	if (mode === "write") {
		await writeFile(MANIFEST_PATH, `${JSON.stringify(built, null, "\t")}\n`, "utf-8");
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

	const policyCheck = verifyAgentsPolicy(packageFiles);
	if (!policyCheck.ok) {
		for (const item of policyCheck.items) {
			console.error(`policy: ${item.id} (${item.kind})`);
		}
		process.exit(1);
	}

	if (built.policy_sha256 && onDisk.policy_sha256 !== built.policy_sha256) {
		console.error("policy_sha256 mismatch — regenerate manifest with --write");
		process.exit(1);
	}

	if (onDisk.package_version !== version) {
		console.error(
			`package_version mismatch: manifest=${onDisk.package_version} package=${version}`,
		);
		process.exit(1);
	}

	console.log(
		`agents.manifest.json OK (${Object.keys(built.agents).length} agents, policy aligned)`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
