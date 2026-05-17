#!/usr/bin/env node
/**
 * Print absolute path to the installed ultimate-pi package root (UP_PKG).
 * Used by /harness-setup and shell scripts in external repos.
 *
 * Resolution order:
 * 1. ULTIMATE_PI_PKG env override
 * 2. require.resolve('ultimate-pi/package.json') from cwd
 * 3. Global npm prefix: $(npm root -g)/ultimate-pi
 * 4. Script location (this file ships inside the package)
 *
 * Exit 0 and prints path; exit 1 if not found.
 */

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const requireFromCwd = createRequire(join(process.cwd(), "package.json"));

const SCRIPT_UP_PKG = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
);

function hasHarnessScripts(root) {
	return existsSync(join(root, ".pi", "scripts", "harness-cli-verify.sh"));
}

function isSourceCheckout(root) {
	try {
		const pkg = requireFromCwd.resolve("./package.json");
		return dirname(pkg) === root;
	} catch {
		return false;
	}
}

function tryResolveUltimatePi() {
	if (hasHarnessScripts(process.cwd()) && isSourceCheckout(process.cwd())) {
		return process.cwd();
	}

	if (process.env.ULTIMATE_PI_PKG) {
		const envRoot = process.env.ULTIMATE_PI_PKG;
		if (hasHarnessScripts(envRoot)) return envRoot;
	}

	try {
		const pkg = requireFromCwd.resolve("ultimate-pi/package.json");
		const root = dirname(pkg);
		if (hasHarnessScripts(root)) return root;
	} catch {
		/* continue */
	}

	try {
		const globalRoot = execSync("npm root -g", {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		const globalPkg = join(globalRoot, "ultimate-pi");
		if (hasHarnessScripts(globalPkg)) return globalPkg;
	} catch {
		/* continue */
	}

	if (hasHarnessScripts(SCRIPT_UP_PKG)) return SCRIPT_UP_PKG;

	return null;
}

const root = tryResolveUltimatePi();
if (!root) {
	console.error(
		"harness-resolve-up-pkg: ultimate-pi not found. Install: pi install npm:ultimate-pi (or npm i -g ultimate-pi)",
	);
	process.exit(1);
}

process.stdout.write(root);
