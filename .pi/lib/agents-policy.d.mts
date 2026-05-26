export type AllowsAgentToolInput = {
	packageRoot: string;
	projectRoot: string;
	agentId: string;
	toolName: string;
	toolInput?: Record<string, unknown>;
	isSubprocess?: boolean;
	isParentOrchestrator?: boolean;
};

export function allowsAgentTool(input: AllowsAgentToolInput): boolean;
export function applyAgentPolicyToConfig(
	agent: Record<string, unknown>,
	packageRoot: string,
	projectRoot: string,
): Record<string, unknown>;
export function findProjectRootFromAgentsDir(projectAgentsDir: string): string;
export function getAgentKind(
	packageRoot: string,
	projectRoot: string,
	agentId: string,
): string;
export function getAgentPolicySpec(
	packageRoot: string,
	projectRoot: string,
	agentId: string,
): unknown;
export function harnessSubagentPhaseHint(
	packageRoot: string,
	projectRoot: string,
	agentId: string,
): string | undefined;
export function isAgtGovernanceActive(projectRoot: string): boolean;
export function isHarnessPlanningAgent(agentId: string): boolean;
export function loadAgentsPolicyMerged(
	packageRoot: string,
	projectRoot: string,
): unknown;
export function packageAgentsPolicyPath(packageRoot: string): string;
export function projectAgentsPolicyPath(projectRoot: string): string;
export function projectPoliciesDir(projectRoot: string): string;
export function resolveEffectiveTools(
	agentId: string,
	merged: unknown,
): string[];
export function resolveExtensionBundlePaths(
	packageRoot: string,
	bundleName: string,
): string[];
