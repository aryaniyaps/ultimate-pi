/**
 * Per-agent tool policy for harness/* subagents (defense in depth with frontmatter).
 */

import {
	evaluateContextModeMutation,
	isMutatingBash,
} from "../../lib/harness-context-mode-policy.js";
import type { HarnessPhase } from "../../lib/harness-run-context.js";
import {
	isSubmitToolName,
	SUBMIT_TOOLS_BY_AGENT,
} from "./harness-subagent-submit-registry.js";
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

/** Planning agents must use submit_* → canonical artifacts/*.yaml, not JSON dumps. */
const PLANNING_ARTIFACT_JSON_WRITE = /artifacts\/[^\s'"`;]+\.json\b/i;

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
		case "running/executor":
			return "executor";
		case "reviewing/evaluator":
			return "evaluator";
		case "reviewing/adversary":
			return "adversary";
		case "reviewing/tie-breaker":
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
		if (
			isSubmitToolName(toolName) &&
			process.env.PI_HARNESS_SUBPROCESS !== "1"
		) {
			return {
				action: "block",
				reason:
					"harness-subagent-policy: submit_* tools are subprocess-only; parent orchestrator must use harness_artifact_ready and write_harness_yaml for merges.",
			};
		}
		return { action: "allow" };
	}

	if (isSubmitToolName(toolName)) {
		if (process.env.PI_HARNESS_SUBPROCESS !== "1") {
			return {
				action: "block",
				reason:
					"harness-subagent-policy: submit_* tools are not available in the parent harness session.",
			};
		}
		if (toolName === "submit_human_required") {
			const kind = classifyHarnessAgent(agentType);
			if (kind === "executor") {
				return {
					action: "block",
					reason:
						"submit_human_required is not available for harness/running/executor.",
				};
			}
			return { action: "allow" };
		}
		const allowed = SUBMIT_TOOLS_BY_AGENT[agentType];
		if (!allowed?.has(toolName)) {
			return {
				action: "block",
				reason: `harness-subagent-policy: ${toolName} is not allowed for ${agentType}.`,
			};
		}
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
		if (
			kind === "planner" &&
			command &&
			PLANNING_ARTIFACT_JSON_WRITE.test(command)
		) {
			return {
				action: "block",
				reason:
					"harness-subagent-policy: artifacts must be YAML only — use submit_* (e.g. submit_hypothesis_brief → artifacts/hypothesis.yaml), not bash writes to .json.",
			};
		}
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

	const ctxPhase =
		(harnessSubagentPhaseHint(agentType) as HarnessPhase | null) ?? "plan";
	const ctxDecision = evaluateContextModeMutation(
		toolName,
		input ?? {},
		ctxPhase,
		{ aborted: false, readOnlyAgent: true },
	);
	if (ctxDecision.blocked) {
		return {
			action: "block",
			reason: ctxDecision.reason.replace(
				/^policy-gate:/,
				"harness-subagent-policy:",
			),
		};
	}

	return { action: "allow" };
}

export { isSubmitToolName } from "./harness-subagent-submit-registry.js";

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
