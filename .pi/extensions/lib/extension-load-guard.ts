import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const LOAD_GUARD_KEY = Symbol.for("ultimate-pi.extension-load-guard");

type LoadGuardRegistry = Set<string>;

function getRegistry(): LoadGuardRegistry {
	const state = globalThis as typeof globalThis & {
		[LOAD_GUARD_KEY]?: LoadGuardRegistry;
	};
	if (!state[LOAD_GUARD_KEY]) {
		state[LOAD_GUARD_KEY] = new Set<string>();
	}
	return state[LOAD_GUARD_KEY];
}

function isSourceRepo(): boolean {
	try {
		const pkg = JSON.parse(
			readFileSync(join(process.cwd(), "package.json"), "utf8"),
		) as { name?: string };
		return pkg.name === "ultimate-pi";
	} catch {
		return false;
	}
}

export function claimExtensionLoad(key: string, moduleUrl: string): boolean {
	const registry = getRegistry();
	const modulePath = fileURLToPath(moduleUrl);
	if (modulePath.includes("/node_modules/ultimate-pi/") && isSourceRepo()) {
		return false;
	}
	if (registry.has(key)) return false;
	registry.add(key);
	return true;
}
