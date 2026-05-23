/**
 * Per-project harness enable/disable — `.pi/harness/project.json`.
 * Default: enabled when the file is missing (backward compatible).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const HARNESS_PROJECT_CONFIG_BASENAME = "project.json";

export interface HarnessProjectConfig {
	schema_version: "1.0.0";
	enabled: boolean;
	updated_at?: string;
}

export function harnessProjectConfigPath(projectRoot: string): string {
	return join(projectRoot, ".pi", "harness", HARNESS_PROJECT_CONFIG_BASENAME);
}

function envOverrideEnabled(): boolean | null {
	const raw = process.env.HARNESS_ENABLED?.trim().toLowerCase();
	if (!raw) return null;
	if (raw === "0" || raw === "false" || raw === "no") return false;
	if (raw === "1" || raw === "true" || raw === "yes") return true;
	return null;
}

export function readHarnessProjectConfig(
	projectRoot: string = process.cwd(),
): HarnessProjectConfig {
	const fromEnv = envOverrideEnabled();
	if (fromEnv !== null) {
		return { schema_version: "1.0.0", enabled: fromEnv };
	}

	const path = harnessProjectConfigPath(projectRoot);
	if (!existsSync(path)) {
		return { schema_version: "1.0.0", enabled: true };
	}

	try {
		const raw = JSON.parse(
			readFileSync(path, "utf8"),
		) as Partial<HarnessProjectConfig>;
		if (typeof raw.enabled === "boolean") {
			return {
				schema_version: "1.0.0",
				enabled: raw.enabled,
				updated_at: raw.updated_at,
			};
		}
	} catch {
		// corrupt file — treat as enabled so operators are not locked out
	}

	return { schema_version: "1.0.0", enabled: true };
}

export function isHarnessProjectEnabled(projectRoot?: string): boolean {
	return readHarnessProjectConfig(projectRoot ?? process.cwd()).enabled;
}

export function writeHarnessProjectEnabled(
	projectRoot: string,
	enabled: boolean,
): HarnessProjectConfig {
	const path = harnessProjectConfigPath(projectRoot);
	mkdirSync(dirname(path), { recursive: true });
	const config: HarnessProjectConfig = {
		schema_version: "1.0.0",
		enabled,
		updated_at: new Date().toISOString(),
	};
	writeFileSync(path, `${JSON.stringify(config, null, "\t")}\n`, "utf8");
	return config;
}

/** Slash commands that stay available while governance is disabled. */
export const HARNESS_ALWAYS_ALLOWED_COMMANDS = new Set([
	"harness-enable",
	"harness-disable",
	"harness-enabled-status",
	"harness-setup",
]);

export function isHarnessWorkflowCommand(command: string): boolean {
	if (!command.startsWith("harness-")) return false;
	if (HARNESS_ALWAYS_ALLOWED_COMMANDS.has(command)) return false;
	return true;
}
