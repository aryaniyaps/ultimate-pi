import type {
	DialogResult,
	NormalizedQuestion,
	QuestionnaireDetail,
	ValidatedAskParams,
} from "../types.js";

/** Build flat ask params for one questionnaire card (TUI/headless sequential). */
export function questionToFlatParams(
	parent: ValidatedAskParams,
	q: NormalizedQuestion,
	index: number,
	total: number,
): ValidatedAskParams {
	const header =
		total > 1 ? `[${index + 1}/${total}] ${parent.question}` : parent.question;
	return {
		...parent,
		mode: "flat",
		question: q.title,
		context: [header, q.description].filter(Boolean).join("\n\n") || undefined,
		options: q.options,
		questions: [],
		allowMultiple: q.allowMultiple,
		allowFreeform: q.options.length === 0 ? true : parent.allowFreeform,
	};
}

export function mergeQuestionnaireResults(
	details: QuestionnaireDetail[],
	last?: DialogResult,
): DialogResult {
	const additionalComments =
		last?.response?.kind === "freeform"
			? last.response.text
			: last?.response && "additionalComments" in last.response
				? last.response.additionalComments
				: undefined;

	return {
		response: {
			kind: "questionnaire",
			questionnaireDetails: details,
			additionalComments,
		},
		cancelled: false,
		ui_backend: last?.ui_backend ?? "tui",
		ui_degraded: last?.ui_degraded,
	};
}

export function detailFromFlatResult(
	questionLabel: string,
	result: DialogResult,
): QuestionnaireDetail | null {
	if (result.cancelled || !result.response) return null;
	const r = result.response;
	if (r.kind === "freeform") {
		return {
			question: questionLabel,
			answer: r.text,
			kind: "freeform",
		};
	}
	if (r.kind === "selection") {
		return {
			question: questionLabel,
			answer: r.selections.join(", "),
			kind: "selection",
			comment: r.comment,
		};
	}
	return null;
}
