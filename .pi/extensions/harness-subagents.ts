/**
 * harness-subagents — package-resolved agents, blackboard, observation-bus handoffs.
 */

import { claimExtensionLoad } from "./lib/extension-load-guard.js";
import { getHarnessPackageRoot } from "./lib/harness-paths.js";
import { createHarnessSubagentsExtension } from "./lib/harness-subagents/vendored/index.js";

// @ts-expect-error pi extensions run as ESM
const MODULE_URL = import.meta.url;

export default claimExtensionLoad("harness-subagents", MODULE_URL)
	? createHarnessSubagentsExtension(getHarnessPackageRoot(MODULE_URL))
	: () => {};
