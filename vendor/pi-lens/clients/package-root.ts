import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const packageRootCache = new Map<string, string>();

/**
 * Resolve the installed package root for the current module.
 * Walks upward from the caller until it finds the nearest package.json.
 *
 * This is the correct alternative to process.cwd() for resolving
 * pi-lens's own assets (rules, grammars, configs) when installed
 * globally — cwd is the user's project, not the extension root.
 *
 * Credit: alexx-ftw (PR #1)
 */
export function getPackageRoot(importMetaUrl: string): string {
	const cached = packageRootCache.get(importMetaUrl);
	if (cached) return cached;

	let current = path.dirname(fileURLToPath(importMetaUrl));
	while (true) {
		if (fs.existsSync(path.join(current, "package.json"))) {
			packageRootCache.set(importMetaUrl, current);
			return current;
		}
		const parent = path.dirname(current);
		if (parent === current) {
			packageRootCache.set(importMetaUrl, current);
			return current;
		}
		current = parent;
	}
}

/**
 * Resolve a path relative to the installed package root.
 */
export function resolvePackagePath(
	importMetaUrl: string,
	...segments: string[]
): string {
	return path.join(getPackageRoot(importMetaUrl), ...segments);
}
