/**
 * Registry: submit tool name → agent allowlist, schema, artifact path.
 */

import type { DebateLaneKind } from "./plan-debate-lane.js";

export interface SubmitToolSpec {
	toolName: string;
	agents: readonly string[];
	schemaFile: string;
	artifactPath: string | ((doc: Record<string, unknown>) => string);
	debateLane?: DebateLaneKind;
	humanRequired?: boolean;
}

function roundPath(prefix: string, doc: Record<string, unknown>): string {
	const r =
		typeof doc.round_index === "number"
			? doc.round_index
			: Number(doc.round_index ?? 1);
	return `artifacts/${prefix}-r${r}.yaml`;
}

export const SUBMIT_TOOL_SPECS: readonly SubmitToolSpec[] = [
	{
		toolName: "submit_scout_findings",
		agents: [
			"harness/planning/scout-graphify",
			"harness/planning/scout-structure",
			"harness/planning/scout-semantic",
		],
		schemaFile: "plan-scout-findings.schema.json",
		artifactPath: (doc) => {
			const lane =
				typeof doc.lane === "string"
					? doc.lane
					: typeof doc.scout_lane === "string"
						? doc.scout_lane
						: "graphify";
			return `artifacts/scout-${lane}.yaml`;
		},
	},
	{
		toolName: "submit_decomposition_brief",
		agents: ["harness/planning/decompose"],
		schemaFile: "plan-decomposition-brief.schema.json",
		artifactPath: "artifacts/decomposition.yaml",
	},
	{
		toolName: "submit_hypothesis_brief",
		agents: ["harness/planning/hypothesis"],
		schemaFile: "plan-hypothesis-brief.schema.json",
		artifactPath: "artifacts/hypothesis.yaml",
	},
	{
		toolName: "submit_implementation_research",
		agents: ["harness/planning/implementation-researcher"],
		schemaFile: "plan-implementation-research-brief.schema.json",
		artifactPath: "artifacts/implementation-research.yaml",
	},
	{
		toolName: "submit_stack_brief",
		agents: ["harness/planning/stack-researcher"],
		schemaFile: "plan-stack-brief.schema.json",
		artifactPath: "artifacts/stack.yaml",
	},
	{
		toolName: "submit_execution_plan_brief",
		agents: ["harness/planning/execution-plan-author"],
		schemaFile: "plan-execution-plan-brief.schema.json",
		artifactPath: "artifacts/execution-plan-draft.yaml",
	},
	{
		toolName: "submit_hypothesis_validation",
		agents: ["harness/planning/hypothesis-validator"],
		schemaFile: "plan-hypothesis-eval.schema.json",
		artifactPath: (doc) => roundPath("hypothesis-validation", doc),
		debateLane: "hypothesis-validation",
	},
	{
		toolName: "submit_validation_turn",
		agents: ["harness/planning/plan-evaluator"],
		schemaFile: "plan-validation-turn.schema.json",
		artifactPath: (doc) => roundPath("validation-turn", doc),
		debateLane: "validation-turn",
	},
	{
		toolName: "submit_adversary_brief",
		agents: ["harness/planning/plan-adversary"],
		schemaFile: "plan-adversary-brief.schema.json",
		artifactPath: (doc) => roundPath("adversary-brief", doc),
		debateLane: "adversary-brief",
	},
	{
		toolName: "submit_sprint_audit",
		agents: ["harness/planning/sprint-contract-auditor"],
		schemaFile: "plan-sprint-audit-turn.schema.json",
		artifactPath: (doc) => roundPath("sprint-audit", doc),
		debateLane: "sprint-audit",
	},
	{
		toolName: "submit_review_round_draft",
		agents: ["harness/planning/review-integrator"],
		schemaFile: "plan-review-round-draft.schema.json",
		artifactPath: (doc) => roundPath("review-round-draft", doc),
	},
	{
		toolName: "submit_executor_handoff",
		agents: ["harness/executor"],
		schemaFile: "harness-executor-handoff.schema.json",
		artifactPath: "handoff/executor-summary.yaml",
	},
	{
		toolName: "submit_eval_verdict",
		agents: ["harness/evaluator"],
		schemaFile: "eval-verdict.schema.json",
		artifactPath: "artifacts/eval-verdict.yaml",
	},
	{
		toolName: "submit_adversary_report",
		agents: ["harness/adversary"],
		schemaFile: "adversary-report.schema.json",
		artifactPath: "artifacts/adversary-report.yaml",
	},
	{
		toolName: "submit_human_required",
		agents: ["harness/planning/decompose", "harness/planning/hypothesis"],
		schemaFile: "harness-human-required.schema.json",
		artifactPath: "artifacts/human-required.yaml",
		humanRequired: true,
	},
] as const;

export const SUBMIT_TOOLS_BY_AGENT: Readonly<
	Record<string, ReadonlySet<string>>
> = (() => {
	const map = new Map<string, Set<string>>();
	for (const spec of SUBMIT_TOOL_SPECS) {
		for (const agent of spec.agents) {
			if (!map.has(agent)) map.set(agent, new Set());
			map.get(agent)?.add(spec.toolName);
		}
	}
	return Object.fromEntries(map.entries());
})();

export function specForSubmitTool(
	toolName: string,
): SubmitToolSpec | undefined {
	return SUBMIT_TOOL_SPECS.find((s) => s.toolName === toolName);
}

export function resolveArtifactRelPath(
	spec: SubmitToolSpec,
	doc: Record<string, unknown>,
): string {
	if (typeof spec.artifactPath === "function") {
		return spec.artifactPath(doc);
	}
	return spec.artifactPath;
}

export function isSubmitToolName(toolName: string): boolean {
	return toolName.startsWith("submit_");
}

export const DEBATE_AGENT_SUBMIT_TOOL: Readonly<Record<string, string>> = {
	"harness/planning/hypothesis-validator": "submit_hypothesis_validation",
	"harness/planning/plan-evaluator": "submit_validation_turn",
	"harness/planning/plan-adversary": "submit_adversary_brief",
	"harness/planning/sprint-contract-auditor": "submit_sprint_audit",
};
