/**
 * harness-subagents — vendored pi-subagents with ultimate-pi discovery and policy gates.
 *
 * Dynamic-imports the bridge only after claimExtensionLoad so a stale global npm
 * install (missing vendor/pi-subagents) does not crash local development in this repo.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { claimHarnessGovernanceLoad } from "./lib/extension-load-guard.js";

// @ts-expect-error pi extensions run as ESM
const MODULE_URL = import.meta.url;

async function loadHarnessSubagents(): Promise<(pi: ExtensionAPI) => void> {
	if (!claimHarnessGovernanceLoad("harness-subagents", MODULE_URL)) {
		return () => {};
	}
	const { getHarnessPackageRoot } = await import("./lib/harness-paths.js");
	const { createHarnessSubagentsExtension } = await import(
		"./lib/harness-subagents-bridge.js"
	);
	return createHarnessSubagentsExtension(getHarnessPackageRoot(MODULE_URL));
}

export default await loadHarnessSubagents();
