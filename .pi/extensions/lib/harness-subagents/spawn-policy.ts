/**
 * Subagent tool policy — block nested orchestration tools (defense in depth).
 */

export const SUBAGENT_BLOCKED_TOOLS = new Set([
	"Agent",
	"get_subagent_result",
	"steer_subagent",
	"blackboard",
	"ask_user",
]);

export interface ToolCallDecision {
	action: "allow" | "block" | "modify";
	reason?: string;
	newArgs?: Record<string, unknown>;
}

export function evaluateSubagentToolCall(toolName: string): ToolCallDecision {
	if (SUBAGENT_BLOCKED_TOOLS.has(toolName)) {
		return {
			action: "block",
			reason: `Tool "${toolName}" is not available in subagent sessions (single spawn depth).`,
		};
	}
	return { action: "allow" };
}
