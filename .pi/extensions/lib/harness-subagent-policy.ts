/**
 * Per-agent tool policy for harness/* subagents (defense in depth with frontmatter).
 */

import {
	evaluateSubagentToolCall,
	type ToolCallDecision,
} from "./spawn-policy.js";

export type HarnessAgentKind =
	| "planner"
	| "executor"
	| "evaluator"
	| "adversary"
	| "tie_breaker"
	| "meta"
	| "trace"
	| "incident"
	| "other";

const MUTATING_TOOLS = new Set(["write", "edit"]);

const PLANNING_BASH_DENY_PATTERNS = [
	/\bgraphify\s+update\b/i,
	/\bgraphify\s+extract\b/i,
	/\bgraphify\s+install\b/i,
	/\bccc\s+(index|init|reset|daemon)\b/i,
	/\bccc\s+search\b.*--refresh/i,
	/\bpip\s+install\b/i,
	/\buv\s+tool\s+install\b/i,
	/\bnpm\s+install\b/i,
	/\bnpm\s+install\b.*cocoindex/i,
	/\buv\s+tool\s+install\b.*cocoindex/i,
];

const BASH_MUTATION_PATTERNS = [
	/\brm\s+-/i,
	/\bmv\s+/i,
	/\bcp\s+/i,
	/\btouch\s+/i,
	/\bmkdir\s+/i,
	/\btee\s+/i,
	/\bgit\s+(add|commit|push|reset|checkout|merge|rebase|cherry-pick|apply)\b/i,
	/\bnpm\s+(install|uninstall|ci)\b/i,
	/\bpnpm\s+(add|install|remove)\b/i,
	/\byarn\s+(add|install|remove)\b/i,
	/\bsed\s+-i\b/i,
	/\bperl\s+-i\b/i,
];

const READ_ONLY_KINDS = new Set<HarnessAgentKind>([
	"planner",
	"evaluator",
	"adversary",
	"tie_breaker",
	"trace",
	"incident",
	"meta",
]);

export function isHarnessPlanningAgent(agentType: string): boolean {
	const id = agentType.replace(/^harness\//, "");
	return id.startsWith("planning/");
}

export function classifyHarnessAgent(agentType: string): HarnessAgentKind {
	const id = agentType.replace(/^harness\//, "");
	if (id.startsWith("planning/")) {
		return "planner";
	}
	switch (id) {
		case "executor":
			return "executor";
		case "evaluator":
			return "evaluator";
		case "adversary":
			return "adversary";
		case "tie-breaker":
			return "tie_breaker";
		case "meta-optimizer":
			return "meta";
		case "trace-librarian":
			return "trace";
		case "incident-recorder":
			return "incident";
		default:
			return agentType.startsWith("harness/") ? "other" : "other";
	}
}

function isMutatingBash(command: string): boolean {
	return BASH_MUTATION_PATTERNS.some((pattern) => pattern.test(command));
}

export function isHarnessPackageAgent(agentType: string): boolean {
	return agentType.startsWith("harness/");
}

export function evaluateHarnessSubagentToolCall(
	toolName: string,
	input: Record<string, unknown> | undefined,
	agentType: string,
): ToolCallDecision {
	const base = evaluateSubagentToolCall(toolName, agentType);
	if (base.action === "block") {
		return base;
	}

	if (!isHarnessPackageAgent(agentType)) {
		return { action: "allow" };
	}

	const kind = classifyHarnessAgent(agentType);
	if (!READ_ONLY_KINDS.has(kind)) {
		return { action: "allow" };
	}

	if (toolName === "create_plan" || toolName === "approve_plan") {
		return {
			action: "block",
			reason: `harness-subagent-policy: ${toolName} is parent-orchestrator only (not available in subagents).`,
		};
	}

	if (MUTATING_TOOLS.has(toolName)) {
		return {
			action: "block",
			reason: `harness-subagent-policy: ${toolName} blocked for harness/${kind} (read-only phase agent).`,
		};
	}

	if (toolName === "bash") {
		const command = String(input?.command ?? "");
		if (command && isMutatingBash(command)) {
			return {
				action: "block",
				reason: `harness-subagent-policy: mutating bash blocked for harness/${kind}.`,
			};
		}
		if (
			command &&
			isHarnessPlanningAgent(agentType) &&
			PLANNING_BASH_DENY_PATTERNS.some((p) => p.test(command))
		) {
			return {
				action: "block",
				reason:
					"harness-subagent-policy: planning scouts may use read-only graphify/sg/ccc commands only.",
			};
		}
	}

	return { action: "allow" };
}

export function harnessSubagentPhaseHint(agentType: string): string | null {
	if (isHarnessPlanningAgent(agentType)) {
		return "plan";
	}
	const kind = classifyHarnessAgent(agentType);
	switch (kind) {
		case "planner":
			return "plan";
		case "executor":
			return "execute";
		case "evaluator":
			return "evaluate";
		case "adversary":
			return "adversary";
		default:
			return null;
	}
}
