import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootByModuleUrl = new Map<string, string>();

/** Resolve ultimate-pi package root from the calling extension module URL. */
export function getHarnessPackageRoot(moduleUrl: string): string {
	const cached = rootByModuleUrl.get(moduleUrl);
	if (cached) {
		return cached;
	}

	let dir = dirname(fileURLToPath(moduleUrl));
	for (let depth = 0; depth < 8; depth++) {
		const pkgPath = join(dir, "package.json");
		if (existsSync(pkgPath)) {
			try {
				const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
					name?: string;
				};
				if (pkg.name === "ultimate-pi") {
					rootByModuleUrl.set(moduleUrl, dir);
					return dir;
				}
			} catch {
				/* try parent */
			}
		}
		const parent = dirname(dir);
		if (parent === dir) {
			break;
		}
		dir = parent;
	}

	const fallback = join(dirname(fileURLToPath(moduleUrl)), "..", "..");
	rootByModuleUrl.set(moduleUrl, fallback);
	return fallback;
}

export function resolveHarnessAsset(
	moduleUrl: string,
	...segments: string[]
): string {
	return join(getHarnessPackageRoot(moduleUrl), ...segments);
}
