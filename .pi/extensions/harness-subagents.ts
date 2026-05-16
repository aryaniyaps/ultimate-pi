/**
 * harness-subagents — package-resolved agents, blackboard, observation-bus handoffs.
 */
import { getHarnessPackageRoot } from "./lib/harness-paths.js";
import { createHarnessSubagentsExtension } from "./lib/harness-subagents/vendored/index.js";

export default createHarnessSubagentsExtension(
	getHarnessPackageRoot(import.meta.url),
);
