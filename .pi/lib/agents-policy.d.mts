export function packageAgentsPolicyPath(packageRoot: string): string;
export function projectAgentsPolicyPath(projectRoot: string): string;
export function projectPoliciesDir(projectRoot: string): string;

export interface AgentPolicySpec {
	kind: string;
	effectiveTools: string[];
	extensionsOff: boolean;
	readOnly: boolean;
	maxTurns?: number;
	thinking?: string;
	submitTool?: string;
}

export interface AllowsAgentToolInput {
	packageRoot: string;
	projectRoot: string;
	agentId: string;
	toolName: string;
	toolInput?: Record<string, unknown>;
	isSubprocess?: boolean;
	isParentOrchestrator?: boolean;
}

export function loadAgentsPolicyMerged(
	packageRoot: string,
	projectRoot: string,
): {
	schemaVersion: string;
	kinds: Map<string, unknown>;
	agents: Map<string, unknown>;
	defaults: unknown;
};

export function resolveEffectiveTools(
	agentId: string,
	merged: ReturnType<typeof loadAgentsPolicyMerged>,
): AgentPolicySpec;

export function getAgentPolicySpec(
	packageRoot: string,
	projectRoot: string,
	agentId: string,
): AgentPolicySpec | null;

export function getAgentKind(
	packageRoot: string,
	projectRoot: string,
	agentId: string,
): string;

export function isHarnessPlanningAgent(agentId: string): boolean;

export function harnessSubagentPhaseHint(
	packageRoot: string,
	projectRoot: string,
	agentId: string,
): string | null;

export function allowsAgentTool(input: AllowsAgentToolInput): boolean;

export function applyAgentPolicyToConfig<T extends { name: string }>(
	agent: T,
	packageRoot: string,
	projectRoot: string,
): T;

export function findProjectRootFromAgentsDir(projectAgentsDir: string): string;

export function isAgtGovernanceActive(projectRoot: string): boolean;
