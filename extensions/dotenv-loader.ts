/**
 * dotenv-loader — loads .env files into process.env before other extensions read config.
 *
 * Runs synchronously in the extension factory so vars are available immediately.
 * Also reloads on session_start (reload/resume) to pick up file changes.
 *
 * Config (env vars, since .env isn't loaded yet):
 *   ENV_LOADER_FILES     — comma-separated .env paths, default: ".env"
 *   ENV_LOADER_OVERRIDE  — "true" to overwrite existing vars, default: "false"
 *   ENV_LOADER_SILENT    — "true" to suppress all output, default: "false"
 *   ENV_LOADER_ENCODING  — file encoding, default: "utf-8"
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// ── .env parser ──────────────────────────────────────────────────

function parseEnv(content: string): Map<string, string> {
	const vars = new Map<string, string>();
	for (const raw of content.split("\n")) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;

		const eq = line.indexOf("=");
		if (eq === -1) continue;

		const key = line.slice(0, eq).trim();
		let val = line.slice(eq + 1).trim();

		// Strip surrounding quotes
		if (
			(val.startsWith('"') && val.endsWith('"')) ||
			(val.startsWith("'") && val.endsWith("'"))
		) {
			val = val.slice(1, -1);
		}

		// Expand ${VAR} and $VAR references from current process.env
		val = val.replace(/\$\{([^}]+)\}/g, (_, name) => process.env[name] ?? "");
		val = val.replace(
			/\$([A-Za-z_][A-Za-z0-9_]*)/g,
			(_, name) => process.env[name] ?? "",
		);

		if (key.length > 0) {
			vars.set(key, val);
		}
	}
	return vars;
}

// ── Load & apply ─────────────────────────────────────────────────

interface LoadResult {
	loaded: number;
	skipped: number;
	files: Array<{ path: string; existed: boolean; vars: number }>;
}

function loadEnvFiles(cwd: string): LoadResult {
	const filesStr = process.env.ENV_LOADER_FILES || ".env";
	const override = process.env.ENV_LOADER_OVERRIDE === "true";
	const encoding =
		(process.env.ENV_LOADER_ENCODING as BufferEncoding) || "utf-8";

	const filePaths = filesStr.split(",").map((f) => resolve(cwd, f.trim()));
	const result: LoadResult = { loaded: 0, skipped: 0, files: [] };

	for (const fp of filePaths) {
		const existed = existsSync(fp);
		let varsCount = 0;

		if (!existed) {
			result.files.push({ path: fp, existed: false, vars: 0 });
			continue;
		}

		try {
			const content = readFileSync(fp, { encoding });
			const vars = parseEnv(content);

			for (const [key, value] of vars) {
				if (!override && key in process.env) {
					result.skipped++;
					continue;
				}
				process.env[key] = value;
				result.loaded++;
				varsCount++;
			}

			result.files.push({ path: fp, existed: true, vars: varsCount });
		} catch (_err) {
			result.files.push({ path: fp, existed: true, vars: 0 });
		}
	}

	return result;
}

// ── Extension ────────────────────────────────────────────────────

export default function dotenvLoader(pi: ExtensionAPI) {
	const silent = process.env.ENV_LOADER_SILENT === "true";
	const cwd = process.cwd();

	// Load immediately in factory — before other extensions' factories run.
	const result = loadEnvFiles(cwd);

	if (!silent) {
		const summary = result.files
			.filter((f) => f.existed)
			.map((f) => `  ${f.path}: ${f.vars} vars applied`)
			.join("\n");

		if (summary) {
			console.log(
				`[dotenv-loader] Loaded ${result.loaded} vars, skipped ${result.skipped} (override=false).\n${summary}`,
			);
		} else {
			const missing = result.files
				.filter((f) => !f.existed)
				.map((f) => f.path)
				.join(", ");
			console.log(`[dotenv-loader] No .env files found. Checked: ${missing}`);
		}
	}

	// Reload on session_start (covers reload/resume/new)
	pi.on("session_start", () => {
		const reloadResult = loadEnvFiles(cwd);

		// Only log if something changed
		if (!silent && reloadResult.loaded > 0) {
			console.log(
				`[dotenv-loader] Reloaded ${reloadResult.loaded} vars from .env files.`,
			);
		}
	});

	// Status command
	pi.registerCommand("env-loader-status", {
		description: "Show dotenv-loader status and loaded .env files",
		handler: async (_args, ctx) => {
			const filesStr = process.env.ENV_LOADER_FILES || ".env";
			const override = process.env.ENV_LOADER_OVERRIDE === "true";
			const paths = filesStr.split(",").map((f) => resolve(cwd, f.trim()));

			const lines = [
				"dotenv-loader status:",
				`  cwd: ${cwd}`,
				`  files: ${paths.join(", ")}`,
				`  override: ${override}`,
				`  silent: ${silent}`,
				`  encoding: ${process.env.ENV_LOADER_ENCODING || "utf-8"}`,
				"",
				"Last load result:",
				`  loaded: ${result.loaded}`,
				`  skipped: ${result.skipped}`,
				...result.files.map(
					(f) => `  ${f.path}: ${f.existed ? `${f.vars} vars` : "not found"}`,
				),
			];

			ctx.ui.notify(lines.join("\n"), "info");
		},
	});
}
