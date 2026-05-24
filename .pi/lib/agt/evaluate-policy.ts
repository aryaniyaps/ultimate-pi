import type { PolicyDecisionResult } from "@microsoft/agent-governance-sdk";
import type { BuildEvaluationContextInput } from "./build-evaluation-context.js";
import { buildHarnessAgtEvaluationContext } from "./build-evaluation-context.js";
import { isHarnessAgtPolicyEnabled } from "./config.js";
import { evaluateLegacyHarnessToolPolicy } from "./legacy-evaluate.js";
import { getAgtPolicyEngine } from "./policy-engine.js";

export interface HarnessPolicyEvaluation {
	allowed: boolean;
	reason: string;
	source: "agt" | "legacy";
	agt?: PolicyDecisionResult;
}

export async function evaluateHarnessToolPolicy(
	packageRoot: string,
	input: BuildEvaluationContextInput,
): Promise<HarnessPolicyEvaluation> {
	if (!isHarnessAgtPolicyEnabled()) {
		const legacy = await evaluateLegacyHarnessToolPolicy(input);
		return {
			allowed: legacy.allowed,
			reason: legacy.reason,
			source: "legacy",
		};
	}

	try {
		const context = await buildHarnessAgtEvaluationContext(input);
		const engine = getAgtPolicyEngine(packageRoot, input.projectRoot);
		const agentDid = String(context.agent_did ?? context.harness_agent_id);
		const result = engine.evaluatePolicy(agentDid, context);
		if (!result.allowed) {
			return {
				allowed: false,
				reason:
					result.reason ??
					`agt-policy: denied by ${result.policyName ?? "policy"}/${result.matchedRule ?? "rule"}`,
				source: "agt",
				agt: result,
			};
		}
		return {
			allowed: true,
			reason: result.reason ?? "allow",
			source: "agt",
			agt: result,
		};
	} catch (err) {
		return {
			allowed: false,
			reason: `agt-policy: evaluation failed (fail-closed): ${String(err)}`,
			source: "agt",
		};
	}
}
