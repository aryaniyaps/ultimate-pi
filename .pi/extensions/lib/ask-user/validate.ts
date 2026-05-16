import type {
	AskResponse,
	AskToolDetails,
	AskUserParams,
	NormalizedOption,
	ValidatedAskParams,
} from "./types.js";

export type { ValidatedAskParams };

export function normalizeOption(
	raw: string | { title: string; description?: string },
): NormalizedOption {
	if (typeof raw === "string") {
		return { title: raw.trim() };
	}
	return {
		title: raw.title.trim(),
		description: raw.description?.trim() || undefined,
	};
}

export function validateAskParams(
	params: AskUserParams,
): ValidatedAskParams | string {
	const question = params.question?.trim();
	if (!question) {
		return "ask_user: question is required";
	}

	const options = (params.options ?? [])
		.map(normalizeOption)
		.filter((o) => o.title);
	if (options.length > 0 && options.length < 2) {
		return "ask_user: provide at least 2 options, or omit options for freeform-only";
	}

	const allowFreeform = params.allowFreeform !== false;
	if (options.length === 0 && !allowFreeform) {
		return "ask_user: options required when allowFreeform is false";
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
		options,
		allowMultiple: params.allowMultiple === true,
		allowFreeform,
		displayMode,
		timeout:
			typeof params.timeout === "number" && params.timeout > 0
				? params.timeout
				: undefined,
	};
}

export function formatResultText(
	response: AskResponse | null,
	cancelled: boolean,
): string {
	if (cancelled || !response) {
		return "User cancelled (no answer)";
	}
	if (response.kind === "freeform") {
		return `User wrote: ${response.text}`;
	}
	if (response.selections.length === 1) {
		return `User selected: ${response.selections[0]}`;
	}
	return `User selected: ${response.selections.join(", ")}`;
}

export function toToolDetails(
	validated: ValidatedAskParams,
	response: AskResponse | null,
	cancelled: boolean,
): AskToolDetails {
	return {
		question: validated.question,
		context: validated.context,
		options: validated.options.map((o) => o.title),
		response,
		cancelled,
	};
}
