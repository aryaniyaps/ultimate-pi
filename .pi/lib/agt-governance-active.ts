import { existsSync } from "node:fs";
import { isAgtGovernanceActive as hasProjectAgtFiles } from "./agents-policy.mjs";
import { isHarnessProjectEnabled } from "./harness-project-config.js";

/** Subprocess AGT + merged policies when harness is on or project declares policy files. */
export function isAgtGovernanceActive(projectRoot?: string): boolean {
	const root = projectRoot ?? process.cwd();
	if (isHarnessProjectEnabled(root)) return true;
	return hasProjectAgtFiles(root);
}

export function projectHasPolicyDir(projectRoot: string): boolean {
	return hasProjectAgtFiles(projectRoot);
}
