import { Type } from "@sinclair/typebox";

export const ApprovePlanParamsSchema = Type.Object({
	plan_packet: Type.Optional(
		Type.Object(
			{},
			{
				description:
					"Optional inline PlanPacket (deprecated). Default: read plan-packet.yaml from active run (ADR 0043).",
			},
		),
	),
	human_summary: Type.Optional(
		Type.String({
			description: "Short summary shown above the plan body.",
		}),
	),
	research_brief: Type.Optional(
		Type.Object(
			{
				decomposition: Type.Optional(
					Type.Union([Type.Object({}), Type.Null()]),
				),
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
	"approve_plan({ human_summary?: string }) — loads plan-packet.yaml from active run";

export const PROMPT_GUIDELINES = [
	"Call approve_plan once when plan-packet.yaml is on disk (path-first; do not embed full packet in tool args).",
	"Use ask_user only for clarification — not for final plan approval.",
	"On Request changes, revise the plan and call approve_plan again.",
];

export const CreatePlanParamsSchema = Type.Object({
	plan_packet: Type.Optional(
		Type.Object(
			{},
			{
				description:
					"Optional inline packet (deprecated). Default: read approved plan from plan_packet_path.",
			},
		),
	),
});
