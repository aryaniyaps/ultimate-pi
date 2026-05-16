/** Keep in sync with validate.ts — test entrypoint for node --test */

/**
 * @param {string | { title: string, description?: string }} raw
 */
export function normalizeOption(raw) {
	if (typeof raw === "string") {
		return { title: raw.trim() };
	}
	return {
		title: raw.title.trim(),
		description: raw.description?.trim() || undefined,
	};
}

/** @param {import('./types.js').AskUserParams} params */
export function validateAskParams(params) {
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

/** @param {import('./types.js').AskResponse | null} response @param {boolean} cancelled */
export function formatResultText(response, cancelled) {
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

/** @param {import('./types.js').ValidatedAskParams} validated */
export function toToolDetails(validated, response, cancelled) {
	return {
		question: validated.question,
		context: validated.context,
		options: validated.options.map((o) => o.title),
		response,
		cancelled,
	};
}
