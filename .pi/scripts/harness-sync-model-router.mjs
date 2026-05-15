#!/usr/bin/env node
/**
 * After `.pi/model-router.json` exists, set sensible Pi defaults (`router` / `auto`)
 * when the project has no `defaultProvider`. Does **not** add/remove npm packages
 * — model routing ships vendored inside ultimate-pi.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

function loadSettings(settingsPath) {
	if (!existsSync(settingsPath)) {
		return null;
	}
	try {
		return JSON.parse(readFileSync(settingsPath, "utf8"));
	} catch {
		console.error("[harness-model-router] Invalid JSON:", settingsPath);
		process.exit(1);
	}
}

function saveSettings(settingsPath, data) {
	mkdirSync(dirname(settingsPath), { recursive: true });
	writeFileSync(
		settingsPath,
		`${JSON.stringify(data, null, "\t")}\n`,
		"utf8",
	);
}

function main() {
	const root = process.cwd();
	const configPath = join(root, ".pi", "model-router.json");
	const settingsPath = join(root, ".pi", "settings.json");
	const hasConfig = existsSync(configPath);

	const settings = loadSettings(settingsPath);
	if (!settings) {
		console.warn(
			"[harness-model-router] No .pi/settings.json — skipping (merge Step 3 first)",
		);
		process.exit(0);
	}

	let changed = false;

	if (!hasConfig) {
		if (settings.defaultProvider === "router") {
			delete settings.defaultProvider;
			delete settings.defaultModel;
			changed = true;
		}
		if (changed) {
			saveSettings(settingsPath, settings);
			console.warn(
				"⚠ No .pi/model-router.json — cleared router defaultProvider if present",
			);
		} else {
			console.log("[harness-model-router] No config file; nothing to do");
		}
		process.exit(0);
	}

	const noProjectDefault =
		settings.defaultProvider == null || settings.defaultProvider === "";

	if (noProjectDefault) {
		settings.defaultProvider = "router";
		settings.defaultModel = "auto";
		changed = true;
	}

	if (changed) {
		saveSettings(settingsPath, settings);
		console.log(
			"✓ Router defaults set (`router` / `auto`) — run /reload in pi when ready",
		);
	} else {
		console.log("[harness-model-router] Defaults unchanged (user set defaultProvider)");
	}
}

main();
