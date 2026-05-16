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

const OptionSchema = Type.Union([
	Type.String({ description: "Option label" }),
	Type.Object({
		title: Type.String({ description: "Short option label" }),
		description: Type.Optional(
			Type.String({ description: "Optional explanation" }),
		),
	}),
]);

export const AskUserParamsSchema = Type.Object({
	question: Type.String({ description: "The question to ask the user" }),
	context: Type.Optional(
		Type.String({ description: "Context shown above the question" }),
	),
	options: Type.Optional(
		Type.Array(OptionSchema, {
			description: "Multiple-choice options (min 2 if provided)",
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
			description: 'Append "Type something…" freeform row',
			default: true,
		}),
	),
	displayMode: Type.Optional(
		StringEnum(["overlay", "inline"] as const, {
			description: "overlay = modal (default), inline = in transcript flow",
		}),
	),
	timeout: Type.Optional(
		Type.Number({
			description: "Auto-cancel after N milliseconds",
			minimum: 1,
		}),
	),
});

export const PROMPT_SNIPPET =
	"Structured user input for ambiguous or high-impact harness decisions";

export const PROMPT_GUIDELINES = [
	"Use ask_user when requirements are ambiguous, conflicting, or high-impact — never guess on harness forks (Firecrawl mode, .env creation, scope, risk, merge policy).",
	"Prefer one focused question per call with 2–4 clear options and short descriptions for trade-offs.",
	"If the user cancels (Esc), stop and report needs_clarification; do not proceed with assumptions.",
	"Do not stack redundant ask_user calls — combine related choices when phase 2 batch mode exists.",
	"Independent evaluator/adversary agents must not call ask_user; emit human_required and let the orchestrator ask.",
];
