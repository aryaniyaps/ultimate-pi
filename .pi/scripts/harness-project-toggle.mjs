#!/usr/bin/env node
/**
 * Toggle per-project harness governance — writes `.pi/harness/project.json`.
 *
 * Usage:
 *   node harness-project-toggle.mjs status [--project-root DIR]
 *   node harness-project-toggle.mjs enable [--project-root DIR]
 *   node harness-project-toggle.mjs disable [--project-root DIR]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CONFIG_BASENAME = "project.json";

function parseArgs(argv) {
	const args = [...argv];
	let projectRoot = process.cwd();
	const positional = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--project-root" && args[i + 1]) {
			projectRoot = args[++i];
			continue;
		}
		positional.push(arg);
	}
	return { projectRoot, action: positional[0] ?? "status" };
}

function configPath(projectRoot) {
	return join(projectRoot, ".pi", "harness", CONFIG_BASENAME);
}

function envOverrideEnabled() {
	const raw = process.env.HARNESS_ENABLED?.trim().toLowerCase();
	if (!raw) return null;
	if (raw === "0" || raw === "false" || raw === "no") return false;
	if (raw === "1" || raw === "true" || raw === "yes") return true;
	return null;
}

function readConfig(projectRoot) {
	const fromEnv = envOverrideEnabled();
	if (fromEnv !== null) {
		return {
			schema_version: "1.0.0",
			enabled: fromEnv,
			source: "env:HARNESS_ENABLED",
		};
	}

	const path = configPath(projectRoot);
	if (!existsSync(path)) {
		return {
			schema_version: "1.0.0",
			enabled: true,
			source: "default",
		};
	}

	try {
		const raw = JSON.parse(readFileSync(path, "utf8"));
		if (typeof raw.enabled === "boolean") {
			return {
				schema_version: "1.0.0",
				enabled: raw.enabled,
				updated_at: raw.updated_at,
				source: path,
			};
		}
	} catch {
		// fall through
	}

	return {
		schema_version: "1.0.0",
		enabled: true,
		source: "default-corrupt-file",
	};
}

function writeConfig(projectRoot, enabled) {
	const path = configPath(projectRoot);
	mkdirSync(dirname(path), { recursive: true });
	const payload = {
		schema_version: "1.0.0",
		enabled,
		updated_at: new Date().toISOString(),
	};
	writeFileSync(path, `${JSON.stringify(payload, null, "\t")}\n`, "utf8");
	return { ...payload, path };
}

function main() {
	const { projectRoot, action } = parseArgs(process.argv.slice(2));
	if (!["status", "enable", "disable"].includes(action)) {
		console.error(
			"Usage: harness-project-toggle.mjs <status|enable|disable> [--project-root DIR]",
		);
		process.exit(1);
	}

	if (action === "status") {
		const config = readConfig(projectRoot);
		console.log(JSON.stringify({ ok: true, projectRoot, ...config }, null, 2));
		return;
	}

	const enabled = action === "enable";
	const written = writeConfig(projectRoot, enabled);
	console.log(
		JSON.stringify(
			{
				ok: true,
				projectRoot,
				enabled: written.enabled,
				path: written.path,
				updated_at: written.updated_at,
				reload_required: true,
			},
			null,
			2,
		),
	);
}

main();
