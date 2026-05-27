import type {
	AskResponse,
	AskToolDetails,
	UiBackend,
	ValidatedAskParams,
} from "./types.js";

export function formatResultText(
	response: AskResponse | null,
	cancelled: boolean,
	opts?: { ui_degraded?: boolean },
): string {
	if (cancelled || !response) {
		return "User cancelled (no answer)";
	}

	if (opts?.ui_degraded) {
		return `Rich ask UI unavailable; using terminal prompt.\n\n${formatResponseBody(response)}`;
	}

	return formatResponseBody(response);
}

function formatResponseBody(response: AskResponse): string {
	if (response.kind === "freeform") {
		const base = `User wrote: ${response.text}`;
		return appendComments(base, response.additionalComments);
	}

	if (response.kind === "questionnaire") {
		const lines = response.questionnaireDetails.map((d) => {
			let line = `- ${d.question}: ${d.answer}`;
			if (d.comment) line += ` (comment: ${d.comment})`;
			return line;
		});
		const body = `User answered questionnaire:\n${lines.join("\n")}`;
		return appendComments(body, response.additionalComments);
	}

	const sel = response.selections;
	let base: string;
	if (sel.length === 1) {
		base = `User selected: ${sel[0]}`;
	} else {
		base = `User selected: ${sel.join(", ")}`;
	}
	const withComment = response.comment
		? `${base}\nComment: ${response.comment}`
		: base;
	return appendComments(withComment, response.additionalComments);
}

function appendComments(body: string, additional?: string): string {
	if (!additional?.trim()) return body;
	return `${body}\nAdditional comments: ${additional.trim()}`;
}

export function optionTitlesForDetails(
	validated: ValidatedAskParams,
): string[] {
	if (validated.mode === "questionnaire") {
		return validated.questions.map((q) => q.title);
	}
	return validated.options.map((o) => o.title);
}

export function toToolDetails(
	validated: ValidatedAskParams,
	response: AskResponse | null,
	cancelled: boolean,
	ui_backend: UiBackend,
	opts?: { ui_degraded?: boolean; non_interactive_blocked?: boolean },
): AskToolDetails {
	return {
		question: validated.question,
		context: validated.context,
		contextFormat: validated.contextFormat,
		options: optionTitlesForDetails(validated),
		response,
		cancelled,
		ui_backend,
		ui_degraded: opts?.ui_degraded,
		non_interactive_blocked: opts?.non_interactive_blocked,
	};
}
