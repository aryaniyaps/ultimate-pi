import { type TUnsafe, Type } from "@sinclair/typebox";

/** Google-safe string enum (flat enum, not Type.Union of literals). */
function StringEnum<T extends string[]>(
	values: T,
	options?: { description?: string },
): TUnsafe<T[number]> {
	return Type.Unsafe({
		type: "string",
		enum: [...values],
		...(options?.description ? { description: options.description } : {}),
	});
}

const OptionObjectSchema = Type.Object({
	title: Type.String({ description: "Short option label" }),
	description: Type.Optional(
		Type.String({ description: "Optional explanation" }),
	),
	recommended: Type.Optional(
		Type.Boolean({ description: "Show a Recommended badge" }),
	),
});

const OptionSchema = Type.Union([
	Type.String({ description: "Option label" }),
	OptionObjectSchema,
]);

const QuestionSchema = Type.Object({
	title: Type.String({ description: "Short label for this sub-question" }),
	description: Type.Optional(
		Type.String({ description: "Full question text shown in the card" }),
	),
	options: Type.Optional(
		Type.Array(OptionSchema, {
			description: "If omitted, renders as freeform textarea",
		}),
	),
	allowMultiple: Type.Optional(
		Type.Boolean({
			description: "Allow multiple selections for this sub-question",
			default: false,
		}),
	),
});

export const AskUserParamsSchema = Type.Object({
	question: Type.String({ description: "The question to ask the user" }),
	context: Type.Optional(
		Type.String({
			description:
				"Additional context (markdown or HTML panel when contextFormat is set)",
		}),
	),
	contextFormat: Type.Optional(
		StringEnum(["markdown", "html"] as const, {
			description: "How to render context in rich UI (default markdown)",
		}),
	),
	options: Type.Optional(
		Type.Array(OptionSchema, {
			description:
				"Flat mode: multiple-choice options (min 2 if provided). Ignored when questions is set.",
		}),
	),
	questions: Type.Optional(
		Type.Array(QuestionSchema, {
			description:
				"Questionnaire mode: batch independent forks in one dialog (max 8)",
		}),
	),
	allowMultiple: Type.Optional(
		Type.Boolean({
			description: "Allow selecting more than one option (Space to toggle)",
			default: false,
		}),
	),
	allowFreeform: Type.Optional(
		Type.Boolean({
			description: 'Allow custom answer (TUI: "Type something…" row)',
			default: true,
		}),
	),
	allowComment: Type.Optional(
		Type.Boolean({
			description: "Collect optional comment after selection",
			default: false,
		}),
	),
	allowSkip: Type.Optional(
		Type.Boolean({
			description: "Questionnaire only: allow submit with unanswered items",
			default: false,
		}),
	),
	displayMode: Type.Optional(
		StringEnum(["overlay", "inline"] as const, {
			description:
				"overlay = modal (default); inline = transcript flow (forces TUI)",
		}),
	),
	timeout: Type.Optional(
		Type.Number({
			description: "Auto-cancel after N milliseconds (TUI/headless only)",
			minimum: 1,
		}),
	),
});

export const PROMPT_SNIPPET =
	"Structured user input for ambiguous or high-impact harness decisions";

export const PROMPT_GUIDELINES = [
	"Use ask_user when requirements are ambiguous, conflicting, or high-impact — never guess on harness forks (Firecrawl mode, .env creation, scope, risk, merge policy).",
	"Prefer one focused flat question with 2–4 options, or use questions[] when 2–4 independent dimensions must be decided in one clarification round (max 8 sub-questions).",
	"Use context (markdown) for evidence bullets; keep under ~500 chars unless the fork is architectural.",
	"Never use ask_user for final plan approval — use approve_plan.",
	"If the user cancels (Esc), stop and report needs_clarification; do not proceed with assumptions.",
	"Independent evaluator/adversary agents must not call ask_user; emit human_required and let the orchestrator ask.",
	"After Phase 0 ask_user, merge answers into task-clarification.yaml via applyAskUserToTaskClarification (harness-decisions skill).",
];
