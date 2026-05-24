/**
 * Subprocess governance bundle: AGT policy on all tool_call + submit_* tools (ADR 0046).
 * Loaded via `pi --no-extensions -e harness-subagent-governance.ts` for harness agents.
 */

import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { claimHarnessGovernanceLoad } from "./lib/extension-load-guard.js";
import { evaluateAgtHarnessToolCall } from "./lib/harness-agt-tool-guard.js";
import { getHarnessPackageRoot } from "./lib/harness-paths.js";
import { classifyHarnessAgent } from "./lib/harness-subagent-policy.js";
import { registerHarnessSubagentSubmitTools } from "./lib/harness-subagent-submit-register.js";

// @ts-expect-error pi extensions run as ESM
const MODULE_URL = import.meta.url;

function policyStateFromEnv() {
	const phase =
		(process.env.HARNESS_SUBAGENT_PHASE_HINT?.trim() as
			| "plan"
			| "execute"
			| "evaluate"
			| "adversary"
			| "merge") ?? "plan";
	return {
		phase,
		approvedPlan: phase === "execute" || phase === "merge",
		planId: process.env.HARNESS_PLAN_ID?.trim() || null,
		aborted: false,
		budgetBypass: false,
	};
}

export default function harnessSubagentGovernance(pi: ExtensionAPI) {
	if (!claimHarnessGovernanceLoad("harness-subagent-governance", MODULE_URL))
		return;
	if (process.env.PI_HARNESS_SUBPROCESS !== "1") {
		return;
	}

	const packageRoot = getHarnessPackageRoot(MODULE_URL);
	registerHarnessSubagentSubmitTools(pi, packageRoot);

	pi.on("tool_call", async (event, ctx) => {
		const agentId = process.env.HARNESS_AGENT_ID?.trim() ?? "harness/unknown";
		const kind = classifyHarnessAgent(agentId);
		process.env.HARNESS_SUBAGENT_PHASE_HINT =
			kind === "executor"
				? "execute"
				: kind === "evaluator"
					? "evaluate"
					: kind === "adversary"
						? "adversary"
						: "plan";

		return evaluateAgtHarnessToolCall({
			moduleUrl: MODULE_URL,
			toolName: event.toolName,
			toolInput: event.input as Record<string, unknown>,
			policyState: policyStateFromEnv(),
			entries: ctx.sessionManager.getEntries(),
			sessionId: ctx.sessionManager.getSessionId(),
			projectRoot: ctx.cwd,
		});
	});
}

export function harnessSubagentGovernanceExtensionPath(
	packageRoot: string,
): string {
	return join(
		packageRoot,
		".pi",
		"extensions",
		"harness-subagent-governance.ts",
	);
}
