import { allowsAgentTool } from "../agents-policy.mjs";
import { evaluateContextModeMutation } from "../harness-context-mode-policy.js";
import {
	extractWritePathFromToolInput,
	getLatestRunContext,
	isPlanPhaseAllowedMutation,
} from "../harness-run-context.js";
import { evaluateSubagentToolCall } from "../harness-spawn-policy.js";
import type { BuildEvaluationContextInput } from "./build-evaluation-context.js";
import {
	buildHarnessAgtEvaluationContext,
	type HarnessAgtContext,
	harnessSessionToolDenyReason,
} from "./build-evaluation-context.js";

/** Combined legacy path for HARNESS_AGT_POLICY=0 parity tests. */
export async function evaluateLegacyHarnessToolPolicy(
	input: BuildEvaluationContextInput,
): Promise<{ allowed: boolean; reason: string; context?: HarnessAgtContext }> {
	const { toolName, toolInput, policyState, entries, projectRoot, sessionId } =
		input;
	const agentId =
		process.env.PI_HARNESS_SUBPROCESS === "1"
			? (process.env.HARNESS_AGENT_ID?.trim() ?? "harness/unknown")
			: "parent-orchestrator";
	const isSubprocess = process.env.PI_HARNESS_SUBPROCESS === "1";
	const isParent = agentId === "parent-orchestrator";

	const spawn = evaluateSubagentToolCall(toolName, agentId);
	if (spawn.action === "block") {
		return { allowed: false, reason: spawn.reason ?? "spawn policy" };
	}

	if (
		!allowsAgentTool({
			packageRoot: input.packageRoot,
			projectRoot,
			agentId,
			toolName,
			toolInput,
			isSubprocess,
			isParentOrchestrator: isParent,
		})
	) {
		return {
			allowed: false,
			reason: `agents-policy: ${toolName} not allowed for ${agentId}`,
		};
	}

	const runCtx = getLatestRunContext(entries);
	const phase = policyState.phase;
	const bashCommand =
		toolName === "bash" ? String(toolInput.command ?? "") : "";

	if (toolName === "write" || toolName === "edit") {
		const planMutation = await isPlanPhaseAllowedMutation(
			toolName,
			toolInput,
			phase,
			runCtx,
			projectRoot,
			{
				aborted: policyState.aborted,
				entries,
				ownerSessionId: runCtx?.owner_pi_session_id,
				currentSessionId: sessionId,
			},
		);
		if (!planMutation.allowed) {
			return {
				allowed: false,
				reason: planMutation.reason ?? "plan phase mutation blocked",
			};
		}
	}

	const ctxMode = evaluateContextModeMutation(toolName, toolInput, phase, {
		aborted: policyState.aborted,
		budgetBypass: policyState.budgetBypass,
		readOnlyAgent: false,
	});
	if (ctxMode.blocked) {
		return { allowed: false, reason: ctxMode.reason };
	}

	const sessionDeny = harnessSessionToolDenyReason({
		toolName,
		toolInput,
		phase,
		agentId,
		entries,
		aborted: policyState.aborted,
	});
	if (sessionDeny) {
		return { allowed: false, reason: sessionDeny };
	}

	const context = await buildHarnessAgtEvaluationContext(input);
	return { allowed: true, reason: "legacy allow", context };
}
