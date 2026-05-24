import { join } from "node:path";
import { appendPolicyAuditEvent } from "./agt/audit-run-sink.js";
import type { BuildEvaluationContextInput } from "./agt/build-evaluation-context.js";
import { evaluateHarnessToolPolicy } from "./agt/evaluate-policy.js";
import { recordHarnessPolicyDeny } from "./agt/kill-switch-state.js";
import {
	recordPolicyAllow,
	recordPolicyDeny,
} from "./agt/trust-run-store.js";
import { getHarnessPackageRoot } from "./harness-paths.js";

type HarnessPhase = "plan" | "execute" | "evaluate" | "adversary" | "merge";

export interface PolicyStateSlice {
	phase: HarnessPhase;
	approvedPlan: boolean;
	planId: string | null;
	aborted: boolean;
	budgetBypass: boolean;
}

export async function evaluateAgtToolCall(input: {
	moduleUrl: string;
	toolName: string;
	toolInput: Record<string, unknown>;
	policyState: PolicyStateSlice;
	entries: unknown[];
	sessionId: string;
	projectRoot: string;
}): Promise<{ block: boolean; reason?: string } | undefined> {
	const packageRoot = getHarnessPackageRoot(input.moduleUrl);
	const evalInput: BuildEvaluationContextInput = {
		toolName: input.toolName,
		toolInput: input.toolInput,
		packageRoot,
		projectRoot: input.projectRoot,
		sessionId: input.sessionId,
		entries: input.entries,
		policyState: input.policyState,
	};

	const result = await evaluateHarnessToolPolicy(packageRoot, evalInput);
	const runId = process.env.HARNESS_RUN_ID?.trim();
	const runDir =
		process.env.HARNESS_RUN_DIR?.trim() ??
		(runId ? join(packageRoot, ".pi", "harness", "runs", runId) : "");

	if (runId && runDir) {
		const agentDid =
			process.env.HARNESS_AGENT_DID?.trim() ??
			(process.env.HARNESS_AGENT_ID?.trim() || "parent-orchestrator");
		appendPolicyAuditEvent({
			runDir,
			runId,
			toolName: input.toolName,
			allowed: result.allowed,
			reason: result.reason,
			agentDid,
			phase: input.policyState.phase,
		});
		if (result.allowed) {
			recordPolicyAllow(runId, agentDid);
		} else {
			recordPolicyDeny(runId, agentDid);
		}
	}

	if (!result.allowed) {
		recordHarnessPolicyDeny(input.sessionId);
		return {
			block: true,
			reason: result.reason.startsWith("agt-policy")
				? result.reason
				: `agt-policy: ${result.reason}`,
		};
	}
	return undefined;
}

/** @deprecated Use evaluateAgtToolCall */
export const evaluateAgtHarnessToolCall = evaluateAgtToolCall;
