import * as fs from "node:fs";

export interface PiLensGlobalConfig {
	noLens?: boolean;
	noLsp?: boolean;
	noAutoformat?: boolean;
	immediateFormat?: boolean;
	lensGuard?: boolean;
}

export function loadPiLensGlobalConfig(): PiLensGlobalConfig {
	const configPath = process.env.PI_LENS_CONFIG_PATH;
	if (!configPath) return {};
	try {
		const raw = fs.readFileSync(configPath, "utf-8");
		return JSON.parse(raw) as PiLensGlobalConfig;
	} catch {
		return {};
	}
}

export function resolvePiLensFlag(
	name: string,
	getFlag: (name: string) => boolean | string | undefined,
	global: PiLensGlobalConfig,
): boolean | string | undefined {
	const fromCli = getFlag(name);
	if (fromCli !== undefined) return fromCli;
	switch (name) {
		case "no-lens":
			return global.noLens;
		case "no-lsp":
			return global.noLsp;
		case "no-autoformat":
			return global.noAutoformat;
		case "immediate-format":
			return global.immediateFormat;
		case "lens-guard":
			return global.lensGuard;
		default:
			return undefined;
	}
}
