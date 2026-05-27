/**
 * Resolve harness project root for Sentrux (.sentrux/rules.toml or architecture manifest).
 */

import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

export const SENTRUX_ROOT_MARKERS = [
	join(".sentrux", "rules.toml"),
	join(".pi", "harness", "sentrux", "architecture.manifest.json"),
];

export async function fileExists(path) {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

export async function hasSentruxRootMarker(dir) {
	for (const marker of SENTRUX_ROOT_MARKERS) {
		if (await fileExists(join(dir, marker))) return true;
	}
	return false;
}

export async function findSentruxProjectRoot(startDir) {
	let dir = resolve(startDir || process.cwd());
	while (true) {
		if (await hasSentruxRootMarker(dir)) return dir;
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

export function takeRootArg(args) {
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

export async function resolveSentruxProjectRoot(explicitRoot) {
	if (explicitRoot) {
		const root = isAbsolute(explicitRoot)
			? resolve(explicitRoot)
			: resolve(process.cwd(), explicitRoot);
		if (!(await hasSentruxRootMarker(root))) {
			throw new Error(
				`${root} has no .sentrux/rules.toml or .pi/harness/sentrux/architecture.manifest.json`,
			);
		}
		return root;
	}
	const root = await findSentruxProjectRoot(process.cwd());
	if (!root) {
		throw new Error(
			"could not find a harness project root above the current directory",
		);
	}
	return root;
}
