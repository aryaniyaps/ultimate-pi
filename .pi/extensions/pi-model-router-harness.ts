/**
 * Vendored [pi-model-router](https://github.com/yeliu84/pi-model-router), gated behind
 * a project-local `.pi/model-router.json` from `/harness-setup` so the extension
 * (and built-in fallback tiers) never load before harness bootstrap.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import vendorModelRouter from "../../vendor/pi-model-router/extensions/index.js";

function isHarnessRouterReady(cwd: string): boolean {
	const path = join(cwd, ".pi", "model-router.json");
	if (!existsSync(path)) {
		return false;
	}
	try {
		const data: unknown = JSON.parse(readFileSync(path, "utf8"));
		if (typeof data !== "object" || data === null) {
			return false;
		}
		const profiles = (data as { profiles?: unknown }).profiles;
		return (
			typeof profiles === "object" &&
			profiles !== null &&
			Object.keys(profiles).length > 0
		);
	} catch {
		return false;
	}
}

export default function piModelRouterHarness(pi: ExtensionAPI) {
	const cwd = process.cwd();
	if (!isHarnessRouterReady(cwd)) {
		console.warn(
			"[ultimate-pi] Model router disabled until `.pi/model-router.json` exists (generate via /harness-setup Step 3.5).",
		);
		return;
	}
	vendorModelRouter(pi);
}
