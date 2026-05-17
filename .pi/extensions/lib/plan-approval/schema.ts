import { Type } from "@sinclair/typebox";

export const ApprovePlanParamsSchema = Type.Object({
	plan_packet: Type.Object(
		{},
		{
			description:
				"Full PlanPacket object (schema_version, plan_id, task_id, scope, assumptions, risk_level, acceptance_checks, rollback_plan).",
		},
	),
	human_summary: Type.Optional(
		Type.String({
			description: "Short summary shown above the plan body.",
		}),
	),
	research_brief: Type.Optional(
		Type.Object(
			{
				decomposition: Type.Optional(Type.Union([Type.Object({}), Type.Null()])),
				hypothesis: Type.Optional(Type.Union([Type.Object({}), Type.Null()])),
				eval: Type.Optional(Type.Union([Type.Object({}), Type.Null()])),
			},
			{
				description:
					"Optional Darwin research: decomposition, hypothesis, eval (plan-review.md only).",
			},
		),
	),
	options: Type.Optional(
		Type.Array(
			Type.Union([
				Type.String(),
				Type.Object({
					title: Type.String(),
					description: Type.Optional(Type.String()),
				}),
			]),
		),
	),
	displayMode: Type.Optional(
		Type.Union([Type.Literal("overlay"), Type.Literal("inline")]),
	),
});

export const PROMPT_SNIPPET =
	"approve_plan({ plan_packet: { ...PlanPacket fields... }, human_summary?: string, research_brief?: { decomposition, hypothesis, eval } })";

export const PROMPT_GUIDELINES = [
	"Call approve_plan once with the complete plan_packet when ready for user approval.",
	"Use ask_user only for clarification — not for final plan approval.",
	"On Request changes, revise the plan and call approve_plan again.",
];
