#!/usr/bin/env node
/**
 * Bootstrap a project-local SearXNG instance for harness-web (Docker Compose).
 *
 * - Creates .searxng/ with official upstream compose template
 * - Writes core-config/settings.yml with json format + limiter off (local dev)
 * - Starts containers and waits for JSON search health
 * - Upserts HARNESS_WEB_SEARCH_ENGINE / HARNESS_WEB_SEARXNG_URL in project .env
 *
 * Usage:
 *   node "$UP_PKG/.pi/scripts/harness-searxng-bootstrap.mjs" [PROJECT_ROOT] [--url-only]
 *   node "$UP_PKG/.pi/scripts/harness-searxng-bootstrap.mjs" --set-url http://127.0.0.1:8080
 *
 * Requires: docker, docker compose, curl
 */

import {
	access,
	copyFile,
	mkdir,
	readFile,
	writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const UP_PKG = join(SCRIPT_DIR, "..", "..");

const SEARXNG_BASE =
	"https://raw.githubusercontent.com/searxng/searxng/master/container";
const DEFAULT_PORT = "8080";
const HEALTH_PATH = "/search?q=harness&format=json";

const MANAGED_START = "# --- harness:env:start ---";
const MANAGED_END = "# --- harness:env:end ---";

const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("-")));
const urlOnly = flags.has("--url-only");
const setUrlIdx = process.argv.indexOf("--set-url");
const setUrl = setUrlIdx !== -1 ? process.argv[setUrlIdx + 1] : null;

const PROJECT_ROOT = args[0] || process.cwd();
const SEARXNG_DIR = join(PROJECT_ROOT, ".searxng");
const CORE_CONFIG = join(SEARXNG_DIR, "core-config");
const SETTINGS_PATH = join(CORE_CONFIG, "settings.yml");
const COMPOSE_PATH = join(SEARXNG_DIR, "docker-compose.yml");
const ENV_COMPOSE = join(SEARXNG_DIR, ".env");

const HARNESS_SETTINGS = `use_default_settings: true

search:
  formats:
    - html
    - json

server:
  limiter: false
  public_instance: false
`;

async function exists(path) {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

function run(cmd, cmdArgs, opts = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, cmdArgs, {
			stdio: opts.inherit ? "inherit" : "pipe",
			cwd: opts.cwd,
			env: { ...process.env, ...opts.env },
		});
		let stdout = "";
		let stderr = "";
		if (!opts.inherit) {
			child.stdout?.on("data", (d) => {
				stdout += d;
			});
			child.stderr?.on("data", (d) => {
				stderr += d;
			});
		}
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) resolve({ stdout, stderr });
			else
				reject(
					new Error(
						`${cmd} ${cmdArgs.join(" ")} exited ${code}\n${stderr || stdout}`,
					),
				);
		});
	});
}

async function requireDocker() {
	for (const bin of ["docker"]) {
		try {
			await run(bin, ["--version"]);
		} catch {
			console.error(`✗ ${bin} not found`);
			console.error(
				"Install Docker: https://docs.searxng.org/admin/installation-docker.html",
			);
			process.exit(1);
		}
	}
	try {
		await run("docker", ["compose", "version"]);
	} catch {
		console.error("✗ docker compose not available");
		console.error(
			"Install Docker Compose v2: https://docs.docker.com/compose/install/",
		);
		process.exit(1);
	}
}

async function curlToFile(url, dest) {
	await run("curl", ["-fsSL", "-o", dest, url]);
}

async function readComposePort() {
	if (!(await exists(ENV_COMPOSE))) return DEFAULT_PORT;
	const text = await readFile(ENV_COMPOSE, "utf8");
	for (const line of text.split("\n")) {
		const m = line.match(/^SEARXNG_PORT=(.+)$/);
		if (m) return m[1].trim().replace(/^["']|["']$/g, "") || DEFAULT_PORT;
	}
	return DEFAULT_PORT;
}

async function ensureSearxngLayout() {
	await mkdir(CORE_CONFIG, { recursive: true });
	if (!(await exists(COMPOSE_PATH))) {
		console.log("Fetching SearXNG docker-compose.yml …");
		await curlToFile(`${SEARXNG_BASE}/docker-compose.yml`, COMPOSE_PATH);
	}
	if (!(await exists(ENV_COMPOSE))) {
		const example = join(SEARXNG_DIR, ".env.example");
		if (!(await exists(example))) {
			console.log("Fetching SearXNG .env.example …");
			await curlToFile(`${SEARXNG_BASE}/.env.example`, example);
		}
		await copyFile(example, ENV_COMPOSE);
	}
	const needsSettings =
		!(await exists(SETTINGS_PATH)) ||
		!(await readFile(SETTINGS_PATH, "utf8")).includes("json");
	if (needsSettings) {
		await writeFile(SETTINGS_PATH, HARNESS_SETTINGS, "utf8");
		console.log(`✓ Wrote ${SETTINGS_PATH} (json format, limiter off)`);
	}
}

async function composeUp() {
	console.log("Starting SearXNG (docker compose up -d) …");
	await run("docker", ["compose", "up", "-d"], { cwd: SEARXNG_DIR, inherit: true });
}

async function waitForHealth(baseUrl) {
	const url = `${baseUrl}${HEALTH_PATH}`;
	const deadline = Date.now() + 90_000;
	let lastErr = "";
	while (Date.now() < deadline) {
		try {
			const res = await fetch(url, {
				headers: { Accept: "application/json" },
				signal: AbortSignal.timeout(10_000),
			});
			if (res.status === 403) {
				throw new Error(
					"SearXNG returned 403 for format=json — ensure search.formats includes json in .searxng/core-config/settings.yml",
				);
			}
			if (res.ok) {
				const data = await res.json();
				if (data && typeof data === "object") {
					console.log(`✓ SearXNG healthy at ${baseUrl}`);
					return;
				}
			}
			lastErr = `HTTP ${res.status}`;
		} catch (err) {
			lastErr = err instanceof Error ? err.message : String(err);
		}
		await new Promise((r) => setTimeout(r, 3000));
	}
	throw new Error(`SearXNG health check timed out (${url}): ${lastErr}`);
}

function upsertEnvKey(content, key, value) {
	const line = `${key}=${value}`;
	const re = new RegExp(`^${key}=.*$`, "m");
	if (re.test(content)) {
		return content.replace(re, line);
	}
	if (content.includes(MANAGED_START) && content.includes(MANAGED_END)) {
		const end = content.indexOf(MANAGED_END);
		return `${content.slice(0, end)}${line}\n${content.slice(end)}`;
	}
	const sep = content.endsWith("\n") || content.length === 0 ? "" : "\n";
	return `${content}${sep}${MANAGED_START}\n# harness-web (SearXNG)\n${line}\n${MANAGED_END}\n`;
}

async function upsertHarnessEnv(baseUrl) {
	const envPath = join(PROJECT_ROOT, ".env");
	let content = "";
	if (await exists(envPath)) {
		content = await readFile(envPath, "utf8");
	} else {
		const template = join(UP_PKG, ".pi", "harness", "env.harness.template");
		if (await exists(template)) {
			content = await readFile(template, "utf8");
		}
	}
	content = upsertEnvKey(content, "HARNESS_WEB_SEARCH_ENGINE", "searxng");
	content = upsertEnvKey(content, "HARNESS_WEB_SEARXNG_URL", baseUrl);
	await writeFile(envPath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
	console.log(`✓ Updated .env: HARNESS_WEB_SEARCH_ENGINE=searxng, HARNESS_WEB_SEARXNG_URL=${baseUrl}`);
}

function normalizeBaseUrl(raw) {
	const url = raw.trim().replace(/\/+$/, "");
	if (!/^https?:\/\//i.test(url)) {
		throw new Error(`Invalid SearXNG URL: ${raw}`);
	}
	return url;
}

async function main() {
	if (setUrl) {
		const baseUrl = normalizeBaseUrl(setUrl);
		await waitForHealth(baseUrl);
		await upsertHarnessEnv(baseUrl);
		process.exit(0);
	}

	if (urlOnly) {
		const port = (await exists(ENV_COMPOSE)) ? await readComposePort() : DEFAULT_PORT;
		console.log(`http://127.0.0.1:${port}`);
		process.exit(0);
	}

	await requireDocker();
	await ensureSearxngLayout();
	const port = await readComposePort();
	const baseUrl = `http://127.0.0.1:${port}`;
	await composeUp();
	await waitForHealth(baseUrl);
	await upsertHarnessEnv(baseUrl);

	console.log("");
	console.log("SearXNG is ready for harness-web:");
	console.log(`  HARNESS_WEB_SEARXNG_URL=${baseUrl}`);
	console.log(`  Test: python3 "${join(UP_PKG, ".pi/scripts/harness-web.py")}" search "test" -o .web/search.json --limit 2`);
}

main().catch((err) => {
	console.error(`✗ ${err.message || err}`);
	process.exit(1);
});
