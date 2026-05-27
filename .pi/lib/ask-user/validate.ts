import { MAX_QUESTIONNAIRE_QUESTIONS } from "./constants.js";
import type {
	AskUserParams,
	NormalizedOption,
	NormalizedQuestion,
	ValidatedAskParams,
} from "./types.js";

export type { ValidatedAskParams };

export function normalizeOption(
	raw: string | { title: string; description?: string; recommended?: boolean },
): NormalizedOption {
	if (typeof raw === "string") {
		return { title: raw.trim() };
	}
	return {
		title: raw.title.trim(),
		description: raw.description?.trim() || undefined,
		recommended: raw.recommended === true ? true : undefined,
	};
}

function normalizeQuestion(
	raw: NonNullable<AskUserParams["questions"]>[number],
): NormalizedQuestion | string {
	const title = raw.title?.trim();
	if (!title) return "ask_user: each questions[] item requires title";

	const options = (raw.options ?? [])
		.map(normalizeOption)
		.filter((o) => o.title);
	if (options.length > 0 && options.length < 2) {
		return `ask_user: question "${title}" needs at least 2 options or omit options for freeform`;
	}

	return {
		title,
		description: raw.description?.trim() || undefined,
		options,
		allowMultiple: raw.allowMultiple === true,
	};
}

export function validateAskParams(
	params: AskUserParams,
): ValidatedAskParams | string {
	const question = params.question?.trim();
	if (!question) {
		return "ask_user: question is required";
	}

	const rawQuestions = params.questions ?? [];
	if (rawQuestions.length > MAX_QUESTIONNAIRE_QUESTIONS) {
		return `ask_user: at most ${MAX_QUESTIONNAIRE_QUESTIONS} questions in questionnaire mode`;
	}

	if (rawQuestions.length > 0 && (params.options?.length ?? 0) > 0) {
		return "ask_user: use either options or questions[], not both";
	}

	const questions: NormalizedQuestion[] = [];
	for (const q of rawQuestions) {
		const normalized = normalizeQuestion(q);
		if (typeof normalized === "string") return normalized;
		questions.push(normalized);
	}

	const options = (params.options ?? [])
		.map(normalizeOption)
		.filter((o) => o.title);
	if (options.length > 0 && options.length < 2) {
		return "ask_user: provide at least 2 options, or omit options for freeform-only";
	}

	const allowFreeform = params.allowFreeform !== false;
	const mode = questions.length > 0 ? "questionnaire" : "flat";

	if (mode === "flat" && options.length === 0 && !allowFreeform) {
		return "ask_user: options required when allowFreeform is false";
	}

	if (mode === "questionnaire" && questions.length === 0) {
		return "ask_user: questions[] must not be empty";
	}

	const displayMode =
		process.env.HARNESS_ASK_USER_DISPLAY_MODE === "inline"
			? "inline"
			: params.displayMode === "inline"
				? "inline"
				: "overlay";

	return {
		question,
		context: params.context?.trim() || undefined,
		contextFormat: params.contextFormat === "html" ? "html" : "markdown",
		options,
		questions,
		mode,
		allowMultiple: params.allowMultiple === true,
		allowFreeform,
		allowComment: params.allowComment === true,
		allowSkip: params.allowSkip === true,
		displayMode,
		timeout:
			typeof params.timeout === "number" && params.timeout > 0
				? params.timeout
				: undefined,
	};
}
