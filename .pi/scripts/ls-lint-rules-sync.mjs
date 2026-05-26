#!/usr/bin/env node
/**
 * Sync .ls-lint.yml from .pi/harness/ls-lint/naming.manifest.json.
 * Preserves user content outside the harness managed block.
 *
 * Usage: node .pi/scripts/ls-lint-rules-sync.mjs [--check] [--force] [PROJECT_ROOT]
 */

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawn, execSync } from "node:child_process";

const UP_PKG = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
/** Target project root (consumer repo). Default: process.cwd(). */
const PROJECT_ROOT =
	process.argv.find((a, i) => i >= 2 && !a.startsWith("-")) || process.cwd();
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
const RULES_PATH = join(PROJECT_ROOT, ".ls-lint.yml");
const META_PATH = join(PROJECT_ROOT, ".ls-lint", ".harness-naming-meta.json");

const MANAGED_START = "# --- harness:managed:start ---";
const MANAGED_END = "# --- harness:managed:end ---";

function fail(msg) {
	console.error(`ls-lint-rules-sync: ${msg}`);
	process.exit(1);
}

function hashContent(text) {
	return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function yamlScalar(value) {
	const s = String(value);
	if (/^[a-zA-Z0-9_.|]+$/.test(s) && !s.includes("regex:")) {
		return s;
	}
	return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function renderRulesBlock(rules, indent) {
	const lines = [];
	const pad = " ".repeat(indent);
	for (const [key, value] of Object.entries(rules)) {
		lines.push(`${pad}${key}: ${yamlScalar(value)}`);
	}
	return lines.join("\n");
}

function renderManagedBlock(manifest) {
	const lines = [];
	lines.push(MANAGED_START);
	lines.push(
		"# Generated from .pi/harness/ls-lint/naming.manifest.json",
	);
	lines.push(`# Project: ${manifest.project ?? "unknown"}`);
	lines.push(`# Schema: ${manifest.schema_version}`);
	lines.push("");
	lines.push("ls:");

	const globalRules = manifest.global_rules ?? {};
	for (const [key, value] of Object.entries(globalRules)) {
		lines.push(`  ${key}: ${yamlScalar(value)}`);
	}

	for (const scoped of manifest.scoped_rules ?? []) {
		const pathKey = scoped.path;
		const pathYaml = /^[a-zA-Z_][\w/-]*$/.test(pathKey)
			? pathKey
			: yamlScalar(pathKey);
		lines.push(`  ${pathYaml}:`);
		lines.push(renderRulesBlock(scoped.rules ?? {}, 4));
	}

	lines.push("");
	lines.push("ignore:");
	for (const item of manifest.ignores ?? []) {
		lines.push(`  - ${yamlScalar(item)}`);
	}

	lines.push(MANAGED_END);
	return lines.join("\n");
}

function mergeRules(existing, managedBlock) {
	const header = `# ls-lint — ${new Date().toISOString().slice(0, 10)}
# Docs: https://ls-lint.org/
# Sync: node $UP_PKG/.pi/scripts/ls-lint-rules-sync.mjs --force (see .pi/scripts/README.md for UP_PKG) or /harness-ls-lint-sync in pi
#
# Custom rules: add YAML below the managed block; they are preserved on sync.

`;

	if (!existing || !existing.includes(MANAGED_START)) {
		return `${header}${managedBlock}\n`;
	}

	const start = existing.indexOf(MANAGED_START);
	const end = existing.indexOf(MANAGED_END);
	if (start === -1 || end === -1 || end < start) {
		return `${header}${managedBlock}\n`;
	}

	const before = existing.slice(0, start);
	const after = existing.slice(end + MANAGED_END.length);
	return `${before}${managedBlock}${after}`.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

async function fileExists(path) {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

function countViolations(output) {
	const matches = output.match(/\d+\s+violations?/i);
	if (matches) {
		const n = Number.parseInt(matches[0], 10);
		if (!Number.isNaN(n)) return n;
	}
	if (/no\s+violations/i.test(output) || /0\s+violations/i.test(output)) {
		return 0;
	}
	const lineMatches = output.match(/✖|✗|error|violation/gi);
	return lineMatches ? lineMatches.length : 0;
}

function lintPathEnv() {
	const extra = [
		process.env.PATH,
		`${process.env.HOME || ""}/.local/bin`,
	].filter(Boolean);
	try {
		const npmBin = execSync("npm prefix -g", { encoding: "utf-8" }).trim();
		extra.push(`${npmBin}/bin`);
	} catch {
		/* ignore */
	}
	return { ...process.env, PATH: extra.join(":") };
}

async function runLsLint() {
	return new Promise((resolve) => {
		const child = spawn("ls-lint", [], {
			cwd: PROJECT_ROOT,
			stdio: ["ignore", "pipe", "pipe"],
			env: lintPathEnv(),
		});
		let out = "";
		child.stdout?.on("data", (d) => {
			out += d.toString();
		});
		child.stderr?.on("data", (d) => {
			out += d.toString();
		});
		child.on("close", (code) => {
			resolve({ code: code ?? 1, out: out.trim() });
		});
		child.on("error", () => resolve({ code: 127, out: "ls-lint not installed" }));
	});
}

async function main() {
	const checkOnly = process.argv.includes("--check");
	const force = process.argv.includes("--force");
	const strict = process.argv.includes("--strict");

	if (!(await fileExists(MANIFEST))) {
		if (await fileExists(MANIFEST_TEMPLATE)) {
			await mkdir(dirname(MANIFEST), { recursive: true });
			await writeFile(
				MANIFEST,
				await readFile(MANIFEST_TEMPLATE, "utf-8"),
				"utf-8",
			);
			console.log(
				`ls-lint-rules-sync: seeded manifest from package -> ${MANIFEST}`,
			);
		} else {
			fail(`missing manifest ${MANIFEST} (and no template in package)`);
		}
	}

	const manifestRaw = await readFile(MANIFEST, "utf-8");
	const manifest = JSON.parse(manifestRaw);
	const manifestHash = hashContent(manifestRaw);
	const managedBlock = renderManagedBlock(manifest);

	let existing = "";
	if (await fileExists(RULES_PATH)) {
		existing = await readFile(RULES_PATH, "utf-8");
	}

	let meta = { manifest_hash: null, synced_at: null };
	if (await fileExists(META_PATH)) {
		try {
			meta = JSON.parse(await readFile(META_PATH, "utf-8"));
		} catch {
			/* ignore */
		}
	}

	const unchanged =
		meta.manifest_hash === manifestHash &&
		(await fileExists(RULES_PATH)) &&
		existing.includes(MANAGED_START);

	if (unchanged && !force) {
		console.log("ls-lint-rules-sync: .ls-lint.yml already up to date");
		if (checkOnly) process.exit(0);
	} else if (checkOnly) {
		fail(
			'.ls-lint.yml out of date — run node "$UP_PKG/.pi/scripts/ls-lint-rules-sync.mjs" --force (see .pi/scripts/README.md for UP_PKG)',
		);
	} else {
		await mkdir(join(PROJECT_ROOT, ".ls-lint"), { recursive: true });
		const next = mergeRules(existing, managedBlock);
		await writeFile(RULES_PATH, next, "utf-8");
		meta = {
			manifest_hash: manifestHash,
			synced_at: new Date().toISOString(),
			manifest_path: ".pi/harness/ls-lint/naming.manifest.json",
		};
		await writeFile(META_PATH, `${JSON.stringify(meta, null, 2)}\n`, "utf-8");
		console.log(`ls-lint-rules-sync: wrote ${RULES_PATH}`);
	}

	const { code, out } = await runLsLint();
	if (code === 127) {
		console.log(
			"ls-lint-rules-sync: ls-lint CLI not found — install via harness-setup §2.9",
		);
		process.exit(0);
	}
	if (code !== 0) {
		console.warn(out || "ls-lint: violations (update manifest or fix paths)");
		if (strict || checkOnly) process.exit(code);
		process.exit(0);
	}
	console.log(out || "ls-lint: pass");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
