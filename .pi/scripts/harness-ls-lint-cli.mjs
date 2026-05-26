#!/usr/bin/env node
/**
 * Run ls-lint against the harness project root.
 *
 * ls-lint reads `.ls-lint.yml` from the working directory. Harness commands must
 * find the nearest ancestor with harness naming config and run from that root.
 *
 * Usage:
 *   node "$UP_PKG/.pi/scripts/harness-ls-lint-cli.mjs" [--root <PROJECT_ROOT>]
 *   node "$UP_PKG/.pi/scripts/harness-ls-lint-cli.mjs" --print-root
 *   node "$UP_PKG/.pi/scripts/harness-ls-lint-cli.mjs" --json
 */

import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { spawn, execSync } from "node:child_process";

const ROOT_MARKERS = [
	".ls-lint.yml",
	join(".pi", "harness", "ls-lint", "naming.manifest.json"),
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
				`harness-ls-lint-cli: ${root} has no .ls-lint.yml or .pi/harness/ls-lint/naming.manifest.json`,
			);
			process.exit(1);
		}
		return root;
	}

	const root = await findProjectRoot(process.cwd());
	if (!root) {
		console.error(
			"harness-ls-lint-cli: could not find a harness project root above the current directory",
		);
		process.exit(1);
	}
	return root;
}

function countViolations(output) {
	const m = output.match(/(\d+)\s+violations?/i);
	if (m) return Number.parseInt(m[1], 10);
	if (/0\s+violations/i.test(output) || /no\s+violations/i.test(output)) {
		return 0;
	}
	return output ? 1 : 0;
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

async function runLsLint(projectRoot) {
	return new Promise((resolve) => {
		const child = spawn("ls-lint", [], {
			cwd: projectRoot,
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
		child.on("error", (err) => {
			if (err?.code === "ENOENT") {
				resolve({ code: 127, out: "ls-lint not installed" });
				return;
			}
			resolve({ code: 1, out: String(err.message) });
		});
	});
}

async function main() {
	const parsed = takeRootArg(process.argv.slice(2));
	const printRoot = parsed.args.includes("--print-root");
	const jsonOut = parsed.args.includes("--json");
	const projectRoot = await resolveProjectRoot(parsed.explicitRoot);

	if (printRoot) {
		console.log(projectRoot);
		return;
	}

	const { code, out } = await runLsLint(projectRoot);

	if (jsonOut) {
		const payload = {
			lint_pass: code === 0,
			violation_count: code === 0 ? 0 : countViolations(out),
			status:
				code === 127
					? "not_installed"
					: code === 0
						? "pass"
						: "fail",
			quality_signal_summary: out.slice(0, 500) || (code === 0 ? "pass" : "fail"),
			project_root: projectRoot,
		};
		console.log(JSON.stringify(payload));
		process.exit(code === 127 ? 0 : code);
	}

	if (out) {
		if (code === 0) console.log(out);
		else console.error(out);
	}

	process.exit(code === 127 ? 127 : code);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
