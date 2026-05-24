/**
 * Subprocess governance bundle: AGT policy on all tool_call + harness submit_* tools.
 * Loaded via `pi --no-extensions -e subagent-governance.ts` for every subagent spawn.
 */

import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getAgentKind, harnessSubagentPhaseHint } from "../lib/agents-policy.mjs";
import { claimSubagentGovernanceLoad } from "../lib/extension-load-guard.js";
import { evaluateAgtToolCall } from "../lib/agt-tool-guard.js";
import { getHarnessPackageRoot } from "../lib/harness-paths.js";
import { registerHarnessSubagentSubmitTools } from "../lib/harness-subagent-submit-register.js";

// @ts-expect-error pi extensions run as ESM
const MODULE_URL = import.meta.url;

function policyStateFromEnv(packageRoot: string, projectRoot: string) {
	const agentId = process.env.HARNESS_AGENT_ID?.trim() ?? "unknown";
	const phase =
		(process.env.HARNESS_SUBAGENT_PHASE_HINT?.trim() as
			| "plan"
			| "execute"
			| "evaluate"
			| "adversary"
			| "merge") ??
		(harnessSubagentPhaseHint(packageRoot, projectRoot, agentId) as
			| "plan"
			| "execute"
			| "evaluate"
			| "adversary"
			| "merge"
			| null) ??
		"plan";
	return {
		phase,
		approvedPlan: phase === "execute" || phase === "merge",
		planId: process.env.HARNESS_PLAN_ID?.trim() || null,
		aborted: false,
		budgetBypass: false,
	};
}

export function subagentGovernanceExtensionPath(packageRoot: string): string {
	return join(packageRoot, ".pi", "extensions", "subagent-governance.ts");
}

/** @deprecated Use subagentGovernanceExtensionPath */
export function harnessSubagentGovernanceExtensionPath(
	packageRoot: string,
): string {
	return subagentGovernanceExtensionPath(packageRoot);
}

export default function subagentGovernance(pi: ExtensionAPI) {
	if (!claimSubagentGovernanceLoad("subagent-governance", MODULE_URL)) return;
	if (process.env.PI_HARNESS_SUBPROCESS !== "1") {
		return;
	}

	const packageRoot = getHarnessPackageRoot(MODULE_URL);
	const projectRoot = process.env.HARNESS_PROJECT_ROOT?.trim() || process.cwd();
	const agentId = process.env.HARNESS_AGENT_ID?.trim() ?? "unknown";

	if (agentId.startsWith("harness/")) {
		registerHarnessSubagentSubmitTools(pi, packageRoot);
		const kind = getAgentKind(packageRoot, projectRoot, agentId);
		process.env.HARNESS_SUBAGENT_PHASE_HINT =
			kind === "executor"
				? "execute"
				: kind === "evaluator"
					? "evaluate"
					: kind === "adversary"
						? "adversary"
						: "plan";
	}

	pi.on("tool_call", async (event, ctx) => {
		const state = policyStateFromEnv(packageRoot, projectRoot);
		return evaluateAgtToolCall({
			moduleUrl: MODULE_URL,
			toolName: event.toolName,
			toolInput: (event.input ?? {}) as Record<string, unknown>,
			policyState: state,
			entries: ctx.sessionManager.getEntries(),
			sessionId: ctx.sessionManager.getSessionId(),
			projectRoot: ctx.cwd,
		});
	});
}
