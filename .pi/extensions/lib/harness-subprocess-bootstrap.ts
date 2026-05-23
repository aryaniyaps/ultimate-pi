/**
 * Seed harness-run-context + policy-gate session entries in subagent subprocesses.
 */

import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import {
	getLatestRunContext,
	type HarnessRunContext,
	isHarnessSubprocess,
	loadRunContextForSubprocess,
	nowIso,
	policyBootstrapFromRunContext,
} from "../../lib/harness-run-context.js";

type PolicyState = {
	phase: "plan" | "execute" | "evaluate" | "adversary" | "merge";
	approvedPlan: boolean;
	planId: string | null;
	budgetBypass: boolean;
	aborted: boolean;
	abortReason: string | null;
	abortedAt: string | null;
	updatedAt: string;
};

function defaultPolicyState(): PolicyState {
	return {
		phase: "plan",
		approvedPlan: false,
		planId: null,
		budgetBypass: false,
		aborted: false,
		abortReason: null,
		abortedAt: null,
		updatedAt: nowIso(),
	};
}

/** Append disk-backed run + policy entries when subprocess has no session context yet. */
export async function bootstrapHarnessSubprocessFromEnv(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
): Promise<HarnessRunContext | null> {
	if (!isHarnessSubprocess()) return null;
	const entries = ctx.sessionManager.getEntries();
	if (getLatestRunContext(entries)) return getLatestRunContext(entries);

	const projectRoot = ctx.cwd;
	const sessionId = ctx.sessionManager.getSessionId();
	const disk = await loadRunContextForSubprocess(projectRoot);
	if (!disk?.plan_ready) return null;

	const runCtx: HarnessRunContext = {
		...disk,
		pi_session_id: sessionId,
	};
	pi.appendEntry("harness-run-context", runCtx);

	const boot = policyBootstrapFromRunContext(runCtx);
	const policy: PolicyState = {
		...defaultPolicyState(),
		phase: boot.phase,
		approvedPlan: boot.approvedPlan,
		planId: boot.planId,
		updatedAt: nowIso(),
	};
	pi.appendEntry("harness-policy-state", policy);

	return runCtx;
}
