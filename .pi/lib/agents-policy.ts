/**
 * agents.policy.yaml — TypeScript surface (implementation in agents-policy.mjs).
 */

export {
	packageAgentsPolicyPath,
	projectAgentsPolicyPath,
	projectPoliciesDir,
	loadAgentsPolicyMerged,
	resolveEffectiveTools,
	getAgentPolicySpec,
	getAgentKind,
	isHarnessPlanningAgent,
	harnessSubagentPhaseHint,
	allowsAgentTool,
	applyAgentPolicyToConfig,
	findProjectRootFromAgentsDir,
	isAgtGovernanceActive,
} from "./agents-policy.mjs";
