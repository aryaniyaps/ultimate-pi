/** AGT feature flags and package-root resolution for harness policies. */

import { existsSync } from "node:fs";
import { join } from "node:path";

export function isHarnessAgtPolicyEnabled(): boolean {
	const raw = process.env.HARNESS_AGT_POLICY?.trim().toLowerCase();
	if (raw === "0" || raw === "false" || raw === "off") return false;
	return true;
}

export function resolveHarnessPoliciesDir(packageRoot: string): string {
	const fromEnv = process.env.HARNESS_AGT_POLICIES_DIR?.trim();
	if (fromEnv && existsSync(fromEnv)) return fromEnv;
	return join(packageRoot, ".pi", "harness", "policies");
}

export function resolveHarnessPackageRootFromEnv(): string {
	return (
		process.env.HARNESS_PKG_ROOT?.trim() ||
		process.env.UP_PKG?.trim() ||
		process.cwd()
	);
}
