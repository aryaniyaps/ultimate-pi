#!/usr/bin/env node
/**
 * Sync .sentrux/rules.toml from .pi/harness/sentrux/architecture.manifest.json.
 * Preserves user content outside the harness managed block.
 *
 * Usage: node .pi/scripts/sentrux-rules-sync.mjs [--check] [--force]
 */

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST = join(
	ROOT,
	".pi",
	"harness",
	"sentrux",
	"architecture.manifest.json",
);
const RULES_PATH = join(ROOT, ".sentrux", "rules.toml");
const META_PATH = join(ROOT, ".sentrux", ".harness-rules-meta.json");

const MANAGED_START = "# --- harness:managed:start ---";
const MANAGED_END = "# --- harness:managed:end ---";

function fail(msg) {
	console.error(`sentrux-rules-sync: ${msg}`);
	process.exit(1);
}

function hashContent(text) {
	return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function renderManagedBlock(manifest) {
	const lines = [];
	lines.push(MANAGED_START);
	lines.push("# Generated from .pi/harness/sentrux/architecture.manifest.json");
	lines.push(`# Project: ${manifest.project ?? "unknown"}`);
	lines.push(`# Schema: ${manifest.schema_version}`);
	lines.push("");
	lines.push("[constraints]");
	const c = manifest.constraints ?? {};
	if (c.max_cycles !== undefined) lines.push(`max_cycles = ${c.max_cycles}`);
	if (c.max_coupling !== undefined)
		lines.push(`max_coupling = "${c.max_coupling}"`);
	if (c.max_cc !== undefined) lines.push(`max_cc = ${c.max_cc}`);
	if (c.no_god_files !== undefined)
		lines.push(`no_god_files = ${c.no_god_files}`);
	lines.push("");

	for (const layer of manifest.layers ?? []) {
		lines.push("[[layers]]");
		lines.push(`name = "${layer.name}"`);
		const paths = (layer.paths ?? []).map((p) => `"${p}"`).join(", ");
		lines.push(`paths = [${paths}]`);
		lines.push(`order = ${layer.order}`);
		if (layer.description) {
			lines.push(`# ${layer.description}`);
		}
		lines.push("");
	}

	for (const b of manifest.boundaries ?? []) {
		lines.push("[[boundaries]]");
		lines.push(`from = "${b.from}"`);
		lines.push(`to = "${b.to}"`);
		lines.push(`reason = "${b.reason.replace(/"/g, '\\"')}"`);
		lines.push("");
	}

	lines.push(MANAGED_END);
	return lines.join("\n");
}

function mergeRules(existing, managedBlock) {
	const header = `# Sentrux rules — ${new Date().toISOString().slice(0, 10)}
# Docs: https://sentrux.dev/docs/rules-engine/
# Sync: npm run harness:sentrux-sync (or /harness-sentrux-sync in pi)
#
# Custom rules: add TOML below the managed block; they are preserved on sync.

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

async function runSentruxCheck() {
	return new Promise((resolve) => {
		const child = spawn("sentrux", ["check", "."], {
			cwd: ROOT,
			stdio: ["ignore", "pipe", "pipe"],
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
		child.on("error", () => resolve({ code: 127, out: "sentrux not installed" }));
	});
}

async function main() {
	const checkOnly = process.argv.includes("--check");
	const force = process.argv.includes("--force");
	const strict = process.argv.includes("--strict");

	if (!(await fileExists(MANIFEST))) {
		fail(`missing manifest ${MANIFEST}`);
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
		console.log("sentrux-rules-sync: rules.toml already up to date");
		if (checkOnly) process.exit(0);
	} else if (checkOnly) {
		fail(
			"rules.toml out of date — run npm run harness:sentrux-sync",
		);
	} else {
		await mkdir(join(ROOT, ".sentrux"), { recursive: true });
		const next = mergeRules(existing, managedBlock);
		await writeFile(RULES_PATH, next, "utf-8");
		meta = {
			manifest_hash: manifestHash,
			synced_at: new Date().toISOString(),
			manifest_path: ".pi/harness/sentrux/architecture.manifest.json",
		};
		await writeFile(META_PATH, `${JSON.stringify(meta, null, 2)}\n`, "utf-8");
		console.log(`sentrux-rules-sync: wrote ${RULES_PATH}`);
	}

	const { code, out } = await runSentruxCheck();
	if (code === 127) {
		console.log(
			"sentrux-rules-sync: sentrux CLI not found — install via harness-setup §2.8",
		);
		process.exit(0);
	}
	if (code !== 0) {
		console.warn(out || "sentrux check: violations (update manifest or fix code)");
		if (strict || checkOnly) process.exit(code);
		process.exit(0);
	}
	console.log(out || "sentrux check: pass");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
