/**
 * Subagent tool policy — block nested orchestration tools (defense in depth).
 */

export const SUBAGENT_BLOCKED_TOOLS = new Set([
	"Agent",
	"get_subagent_result",
	"steer_subagent",
	"blackboard",
	"subagent",
]);

const ASK_USER_ALLOWED_AGENT_TYPES = new Set([
	"harness/reviewing/evaluator",
	"harness/reviewing/adversary",
	"harness/reviewing/tie-breaker",
]);

export interface ToolCallDecision {
	action: "allow" | "block" | "modify";
	reason?: string;
	newArgs?: Record<string, unknown>;
}

export function evaluateSubagentToolCall(
	toolName: string,
	agentType?: string,
): ToolCallDecision {
	if (SUBAGENT_BLOCKED_TOOLS.has(toolName)) {
		return {
			action: "block",
			reason: `Tool "${toolName}" is not available in subagent sessions (single spawn depth).`,
		};
	}
	if (toolName === "ask_user") {
		if (agentType && ASK_USER_ALLOWED_AGENT_TYPES.has(agentType)) {
			return { action: "allow" };
		}
		return {
			action: "block",
			reason: `Tool "ask_user" is not available for ${agentType ?? "this agent"} (orchestrator-only).`,
		};
	}
	if (toolName === "approve_plan" || toolName === "create_plan") {
		return {
			action: "block",
			reason: `Tool "${toolName}" is only available in the parent harness orchestrator session.`,
		};
	}
	return { action: "allow" };
}
