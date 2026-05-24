/**
 * agents.policy.yaml — TypeScript surface (implementation in agents-policy.mjs).
 */

export {
	allowsAgentTool,
	applyAgentPolicyToConfig,
	findProjectRootFromAgentsDir,
	getAgentKind,
	getAgentPolicySpec,
	harnessSubagentPhaseHint,
	isAgtGovernanceActive,
	isHarnessPlanningAgent,
	loadAgentsPolicyMerged,
	packageAgentsPolicyPath,
	projectAgentsPolicyPath,
	projectPoliciesDir,
	resolveEffectiveTools,
} from "./agents-policy.mjs";
