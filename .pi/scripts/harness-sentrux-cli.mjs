#!/usr/bin/env node
/**
 * Run the Sentrux CLI against the harness project root.
 *
 * Sentrux resolves `.sentrux/rules.toml` relative to the PATH argument, so
 * harness commands must not rely on the current working directory. This helper
 * finds the nearest ancestor with harness Sentrux config and passes that root
 * explicitly to `sentrux check` / `sentrux gate`.
 *
 * Usage:
 *   node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" check [--root <PROJECT_ROOT>]
 *   node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" gate [--save] [--root <PROJECT_ROOT>]
 *   node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" --print-root
 */

import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { spawn } from "node:child_process";

const ROOT_MARKERS = [
	join(".sentrux", "rules.toml"),
	join(".pi", "harness", "sentrux", "architecture.manifest.json"),
];

async function fileExists(path) {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

async function hasRootMarker(dir) {
	for (const marker of ROOT_MARKERS) {
		if (await fileExists(join(dir, marker))) return true;
	}
	return false;
}

async function findProjectRoot(startDir) {
	let dir = resolve(startDir || process.cwd());
	while (true) {
		if (await hasRootMarker(dir)) return dir;
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

function takeRootArg(args) {
	const next = [];
	let explicitRoot = process.env.HARNESS_PROJECT_ROOT || "";
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--root") {
			explicitRoot = args[i + 1] || "";
			i++;
			continue;
		}
		if (arg.startsWith("--root=")) {
			explicitRoot = arg.slice("--root=".length);
			continue;
		}
		next.push(arg);
	}
	return { args: next, explicitRoot };
}

async function resolveProjectRoot(explicitRoot) {
	if (explicitRoot) {
		const root = isAbsolute(explicitRoot)
			? resolve(explicitRoot)
			: resolve(process.cwd(), explicitRoot);
		if (!(await hasRootMarker(root))) {
			console.error(
				`harness-sentrux-cli: ${root} has no .sentrux/rules.toml or .pi/harness/sentrux/architecture.manifest.json`,
			);
			process.exit(1);
		}
		return root;
	}

	const root = await findProjectRoot(process.cwd());
	if (!root) {
		console.error(
			"harness-sentrux-cli: could not find a harness project root above the current directory",
		);
		process.exit(1);
	}
	return root;
}

function normalizeSentruxArgs(args, projectRoot) {
	const command = args[0];
	if (!command || command === "--help" || command === "-h") {
		console.log(`Usage: node harness-sentrux-cli.mjs <check|gate> [sentrux flags] [--root PROJECT_ROOT]

Runs Sentrux with PROJECT_ROOT passed explicitly so .sentrux/rules.toml is found even when invoked from .pi/harness/runs/*.`);
		process.exit(0);
	}
	if (command !== "check" && command !== "gate") {
		console.error(
			`harness-sentrux-cli: unsupported command "${command}" (expected check or gate)`,
		);
		process.exit(2);
	}
	return [command, ...args.slice(1), projectRoot];
}

async function main() {
	const parsed = takeRootArg(process.argv.slice(2));
	const printRoot = parsed.args.includes("--print-root");
	const sentruxArgs = parsed.args.filter((arg) => arg !== "--print-root");
	const projectRoot = await resolveProjectRoot(parsed.explicitRoot);

	if (printRoot) {
		console.log(projectRoot);
		return;
	}

	function parseSentruxTimeoutMs() {
		const raw = process.env.HARNESS_SENTRUX_TIMEOUT_MS;
		if (raw?.trim()) {
			const parsed = Number.parseInt(raw, 10);
			if (Number.isFinite(parsed) && parsed > 0) return parsed;
		}
		return 300_000;
	}

	const timeoutMs = parseSentruxTimeoutMs();
	let timedOut = false;
	const child = spawn("sentrux", normalizeSentruxArgs(sentruxArgs, projectRoot), {
		cwd: projectRoot,
		stdio: "inherit",
		env: process.env,
	});
	const timer = setTimeout(() => {
		timedOut = true;
		child.kill("SIGTERM");
	}, timeoutMs);
	child.on("error", (err) => {
		clearTimeout(timer);
		if (err?.code === "ENOENT") {
			console.error("harness-sentrux-cli: sentrux not installed");
			process.exit(127);
		}
		console.error(`harness-sentrux-cli: ${err.message}`);
		process.exit(1);
	});
	child.on("close", (code) => {
		clearTimeout(timer);
		if (timedOut) {
			console.error(
				`harness-sentrux-cli: timed out after ${timeoutMs}ms (HARNESS_SENTRUX_TIMEOUT_MS)`,
			);
			process.exit(124);
		}
		process.exit(code ?? 1);
	});
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
