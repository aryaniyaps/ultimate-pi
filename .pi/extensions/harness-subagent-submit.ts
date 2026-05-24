/**
 * Subprocess-only harness submit tools — validate + write artifacts under run_dir.
 * Prefer harness-subagent-governance.ts bundle (AGT + submit) for harness spawns.
 */

import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isHarnessAgtPolicyEnabled } from "../lib/agt/config.js";
import { claimHarnessGovernanceLoad } from "./lib/extension-load-guard.js";
import { evaluateAgtHarnessToolCall } from "./lib/harness-agt-tool-guard.js";
import { getHarnessPackageRoot } from "./lib/harness-paths.js";
import { evaluateHarnessSubagentToolCall } from "./lib/harness-subagent-policy.js";
import {
	isSubprocessHarnessSubmit,
	registerHarnessSubagentSubmitTools,
	resolveHarnessSubmitRunContext,
} from "./lib/harness-subagent-submit-register.js";

// @ts-expect-error pi extensions run as ESM
const MODULE_URL = import.meta.url;

export default function harnessSubagentSubmit(pi: ExtensionAPI) {
	if (!claimHarnessGovernanceLoad("harness-subagent-submit", MODULE_URL))
		return;
	if (process.env.PI_HARNESS_SUBPROCESS !== "1") {
		return;
	}

	const packageRoot = getHarnessPackageRoot(MODULE_URL);
	registerHarnessSubagentSubmitTools(pi, packageRoot);

	pi.on("tool_call", async (event, ctx) => {
		if (!event.toolName.startsWith("submit_")) return undefined;
		if (!isSubprocessHarnessSubmit()) {
			return {
				block: true,
				reason:
					"harness-subagent-submit: submit_* tools are only available in harness subagent subprocesses.",
			};
		}
		const { agentId } = resolveHarnessSubmitRunContext(packageRoot);
		if (!agentId) {
			return {
				block: true,
				reason:
					"harness-subagent-submit: HARNESS_AGENT_ID is required for submit tools.",
			};
		}

		if (isHarnessAgtPolicyEnabled()) {
			return evaluateAgtHarnessToolCall({
				moduleUrl: MODULE_URL,
				toolName: event.toolName,
				toolInput: event.input as Record<string, unknown>,
				policyState: {
					phase:
						(process.env.HARNESS_SUBAGENT_PHASE_HINT as
							| "plan"
							| "execute"
							| "evaluate"
							| "adversary"
							| "merge") ?? "plan",
					approvedPlan: true,
					planId: null,
					aborted: false,
					budgetBypass: false,
				},
				entries: ctx.sessionManager.getEntries(),
				sessionId: ctx.sessionManager.getSessionId(),
				projectRoot: ctx.cwd,
			});
		}

		const decision = evaluateHarnessSubagentToolCall(
			event.toolName,
			event.input as Record<string, unknown>,
			agentId,
		);
		if (decision.action === "block") {
			return { block: true, reason: decision.reason };
		}
		return undefined;
	});
}

/** Absolute path to the subprocess submit extension (legacy standalone). */
export function harnessSubagentSubmitExtensionPath(
	packageRoot: string,
): string {
	return join(packageRoot, ".pi", "extensions", "harness-subagent-submit.ts");
}
