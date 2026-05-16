#!/usr/bin/env node
/**
 * Sync project-root `.env` with harness-required keys (non-destructive).
 *
 * - Never overwrites existing keys or values.
 * - If `.env` is missing: exit 2 and print instructions (use --create-missing after user confirms).
 * - If `.env` exists: append only missing keys inside a managed block at EOF.
 *
 * Usage:
 *   node harness-sync-env.mjs [--create-missing] [--dry-run]
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const UP_PKG = join(SCRIPT_DIR, "..", "..");
const TEMPLATE_PATH = join(UP_PKG, ".pi", "harness", "env.harness.template");
const ENV_PATH = join(process.cwd(), ".env");

const MANAGED_START = "# --- harness:env:start ---";
const MANAGED_END = "# --- harness:env:end ---";

function parseEnvKeys(content) {
	const keys = new Set();
	for (const raw of content.split("\n")) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;
		const eq = line.indexOf("=");
		if (eq === -1) continue;
		const key = line.slice(0, eq).trim();
		if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) keys.add(key);
	}
	return keys;
}

/** @returns {{ key: string, line: string }[]} */
function parseTemplateEntries(templateText) {
	const entries = [];
	for (const raw of templateText.split("\n")) {
		const trimmed = raw.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			if (trimmed) entries.push({ key: null, line: raw });
			continue;
		}
		const eq = trimmed.indexOf("=");
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
		entries.push({ key, line: raw });
	}
	return entries;
}

function buildManagedBlock(missingEntries) {
	const lines = [
		"",
		MANAGED_START,
		"# Added by /harness-setup — edit values; existing keys elsewhere in .env are never changed.",
	];
	for (const entry of missingEntries) {
		lines.push(entry.line);
	}
	lines.push(MANAGED_END);
	lines.push("");
	return lines.join("\n");
}

function insertIntoManagedBlock(content, missingEntries) {
	const block = buildManagedBlock(missingEntries).trimEnd();
	if (!content.includes(MANAGED_START)) {
		const sep = content.endsWith("\n") || content.length === 0 ? "" : "\n";
		return content + sep + block + "\n";
	}
	const start = content.indexOf(MANAGED_START);
	const end = content.indexOf(MANAGED_END);
	if (end === -1 || end < start) {
		const sep = content.endsWith("\n") ? "" : "\n";
		return content + sep + block + "\n";
	}
	const before = content.slice(0, end + MANAGED_END.length);
	const after = content.slice(end + MANAGED_END.length);
	const additions = missingEntries.map((e) => e.line).join("\n");
	return `${before}\n${additions}${after}`;
}

function main() {
	const createMissing = process.argv.includes("--create-missing");
	const dryRun = process.argv.includes("--dry-run");

	if (!existsSync(TEMPLATE_PATH)) {
		console.error(`harness-sync-env: missing template ${TEMPLATE_PATH}`);
		process.exit(1);
	}

	const templateText = readFileSync(TEMPLATE_PATH, "utf8");
	const templateEntries = parseTemplateEntries(templateText);
	const templateKeys = templateEntries.filter((e) => e.key);

	if (!existsSync(ENV_PATH)) {
		if (createMissing) {
			const body = `${templateText.trimEnd()}\n`;
			if (dryRun) {
				console.log("[dry-run] would create .env from harness template");
				process.stdout.write(body);
				process.exit(0);
			}
			writeFileSync(ENV_PATH, body, "utf8");
			console.log("✓ Created .env from harness template (edit secrets locally)");
			process.exit(0);
		}
		console.log("✗ No .env at project root");
		console.log("");
		console.log("Create one, then re-run harness env sync:");
		console.log(`  cp "${TEMPLATE_PATH}" .env`);
		console.log("  # edit .env with your API keys");
		console.log(`  node "${join(UP_PKG, ".pi", "scripts", "harness-sync-env.mjs")}"`);
		console.log("");
		console.log("Or, after user confirms:");
		console.log(
			`  node "${join(UP_PKG, ".pi", "scripts", "harness-sync-env.mjs")}" --create-missing`,
		);
		process.exit(2);
	}

	const existing = readFileSync(ENV_PATH, "utf8");
	const existingKeys = parseEnvKeys(existing);
	const missing = templateKeys.filter((e) => !existingKeys.has(e.key));

	if (missing.length === 0) {
		console.log("✓ .env contains all harness template keys — no changes");
		process.exit(0);
	}

	const next = insertIntoManagedBlock(existing, missing);
	if (dryRun) {
		console.log(`[dry-run] would append ${missing.length} key(s): ${missing.map((m) => m.key).join(", ")}`);
		process.exit(0);
	}

	writeFileSync(ENV_PATH, next, "utf8");
	console.log(
		`✓ Appended ${missing.length} harness env key(s) to .env (existing values preserved): ${missing.map((m) => m.key).join(", ")}`,
	);
}

main();
