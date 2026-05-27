/**
 * Registry: submit tool name → schema, artifact path (allowlists live in agents.policy.yaml).
 */

import type { DebateLaneKind } from "./plan-debate-lane.js";

export interface SubmitToolSpec {
	toolName: string;
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
		toolName: "submit_planning_context",
		schemaFile: "plan-planning-context.schema.json",
		artifactPath: "artifacts/planning-context.yaml",
	},
	{
		toolName: "submit_decomposition_brief",
		schemaFile: "plan-decomposition-brief.schema.json",
		artifactPath: "artifacts/decomposition.yaml",
	},
	{
		toolName: "submit_hypothesis_brief",
		schemaFile: "plan-hypothesis-brief.schema.json",
		artifactPath: "artifacts/hypothesis.yaml",
	},
	{
		toolName: "submit_implementation_research",
		schemaFile: "plan-implementation-research-brief.schema.json",
		artifactPath: "artifacts/implementation-research.yaml",
	},
	{
		toolName: "submit_stack_brief",
		schemaFile: "plan-stack-brief.schema.json",
		artifactPath: "artifacts/stack.yaml",
	},
	{
		toolName: "submit_execution_plan_brief",
		schemaFile: "plan-execution-plan-brief.schema.json",
		artifactPath: "artifacts/execution-plan-draft.yaml",
	},
	{
		toolName: "submit_hypothesis_validation",
		schemaFile: "plan-hypothesis-eval.schema.json",
		artifactPath: (doc) => roundPath("hypothesis-validation", doc),
		debateLane: "hypothesis-validation",
	},
	{
		toolName: "submit_validation_turn",
		schemaFile: "plan-validation-turn.schema.json",
		artifactPath: (doc) => roundPath("validation-turn", doc),
		debateLane: "validation-turn",
	},
	{
		toolName: "submit_adversary_brief",
		schemaFile: "plan-adversary-brief.schema.json",
		artifactPath: (doc) => roundPath("adversary-brief", doc),
		debateLane: "adversary-brief",
	},
	{
		toolName: "submit_sprint_audit",
		schemaFile: "plan-sprint-audit-turn.schema.json",
		artifactPath: (doc) => roundPath("sprint-audit", doc),
		debateLane: "sprint-audit",
	},
	{
		toolName: "submit_review_round_draft",
		schemaFile: "plan-review-round-draft.schema.json",
		artifactPath: (doc) => roundPath("review-round-draft", doc),
	},
	{
		toolName: "submit_executor_handoff",
		schemaFile: "harness-executor-handoff.schema.json",
		artifactPath: "handoff/executor-summary.yaml",
	},
	{
		toolName: "submit_eval_verdict",
		schemaFile: "eval-verdict.schema.json",
		artifactPath: "artifacts/eval-verdict.yaml",
	},
	{
		toolName: "submit_adversary_report",
		schemaFile: "adversary-report.schema.json",
		artifactPath: "artifacts/adversary-report.yaml",
	},
	{
		toolName: "submit_human_required",
		schemaFile: "harness-human-required.schema.json",
		artifactPath: "artifacts/human-required.yaml",
		humanRequired: true,
	},
	{
		toolName: "submit_sentrux_manifest_proposal",
		schemaFile: "sentrux-manifest-proposal.schema.json",
		artifactPath: "artifacts/sentrux-manifest-proposal.yaml",
	},
	{
		toolName: "submit_sentrux_repair_plan",
		schemaFile: "sentrux-repair-plan.schema.json",
		artifactPath: "artifacts/sentrux-repair-plan.yaml",
	},
	{
		toolName: "submit_ls_lint_manifest_proposal",
		schemaFile: "ls-lint-manifest-proposal.schema.json",
		artifactPath: "artifacts/ls-lint-manifest-proposal.yaml",
	},
] as const;

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
