import { evaluateHarnessSubagentToolCall } from "../../extensions/lib/harness-subagent-policy.js";
import {
	evaluateContextModeMutation,
	isMutatingBash,
} from "../harness-context-mode-policy.js";
import {
	getLatestRunContext,
	type HarnessPhase,
	isPlanPhaseAllowedMutation,
} from "../harness-run-context.js";
import type { BuildEvaluationContextInput } from "./build-evaluation-context.js";

const MUTATING_TOOLS = new Set(["write", "edit"]);

/** Combined legacy policy-gate + subagent-policy path for parity tests and HARNESS_AGT_POLICY=0. */
export async function evaluateLegacyHarnessToolPolicy(
	input: BuildEvaluationContextInput,
): Promise<{ allowed: boolean; reason: string }> {
	const { toolName, toolInput, policyState, entries, projectRoot, sessionId } =
		input;
	const phase = policyState.phase;
	const runCtx = getLatestRunContext(entries);

	const sub = evaluateHarnessSubagentToolCall(
		toolName,
		toolInput,
		process.env.PI_HARNESS_SUBPROCESS === "1"
			? (process.env.HARNESS_AGENT_ID?.trim() ?? "harness/unknown")
			: "parent-orchestrator",
	);
	if (sub.action === "block") {
		return { allowed: false, reason: sub.reason ?? "blocked" };
	}

	if (MUTATING_TOOLS.has(toolName)) {
		const decision = await isPlanPhaseAllowedMutation(
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
		if (!decision.allowed) {
			return {
				allowed: false,
				reason: decision.reason ?? "policy-gate: plan mutation denied",
			};
		}
		return { allowed: true, reason: "allow" };
	}

	if (toolName === "bash") {
		const command = String(toolInput.command ?? "");
		if (command && isMutatingBash(command)) {
			if (policyState.aborted) {
				return {
					allowed: false,
					reason:
						"policy-gate: mutating bash command blocked because harness-abort lock is active.",
				};
			}
			if (phase !== "execute" && phase !== "merge") {
				return {
					allowed: false,
					reason: `policy-gate: mutating bash command blocked in phase '${phase}'.`,
				};
			}
		}
	}

	const ctxDecision = evaluateContextModeMutation(toolName, toolInput, phase, {
		aborted: policyState.aborted,
		budgetBypass: policyState.budgetBypass,
	});
	if (ctxDecision.blocked) {
		return { allowed: false, reason: ctxDecision.reason };
	}

	if (toolName === "bash") {
		const command = String(toolInput.command ?? "");
		const WEB_ALLOW = [
			/harness-web\.py\b/i,
			/harness-cli-verify\.sh\b/i,
			/\bgraphify\b/i,
			/\bctx7\b/i,
			/\bcontext7\b/i,
			/\bgit\b/i,
			/harness-searxng-bootstrap/i,
		];
		const WEB_BLOCK = [
			/\bfirecrawl\b/i,
			/\b(?:curl|wget)\b[^\n|;&]*\s+https?:\/\//i,
			/\bscrapling\s+(?:fetch|extract)\b/i,
		];
		if (
			command &&
			!WEB_ALLOW.some((re) => re.test(command)) &&
			WEB_BLOCK.some((re) => re.test(command))
		) {
			return {
				allowed: false,
				reason:
					"harness-web-guard: use web_search or web_fetch instead of raw curl/wget.",
			};
		}
	}

	return { allowed: true, reason: "allow" };
}

export function legacyPhaseFromEnv(): HarnessPhase {
	return (process.env.HARNESS_SUBAGENT_PHASE_HINT as HarnessPhase) ?? "plan";
}
