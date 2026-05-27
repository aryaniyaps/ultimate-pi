import type { AskResponse, QuestionnaireDetail } from "../types.js";

export function parseGlimpseRawResult(
	raw: Record<string, unknown> | null,
	cancelled: boolean,
): AskResponse | null {
	if (cancelled || !raw) return null;

	const kind = raw.kind;
	if (kind === "freeform") {
		return {
			kind: "freeform",
			text: String(raw.text ?? "").trim(),
			additionalComments: pickString(raw.additionalComments),
		};
	}

	if (kind === "questionnaire") {
		const questionnaireDetails: QuestionnaireDetail[] = Array.isArray(
			raw.questionnaireDetails,
		)
			? raw.questionnaireDetails.map((d: unknown) => {
					const entry = d as Record<string, unknown>;
					return {
						question: String(entry.question ?? ""),
						answer: String(entry.answer ?? ""),
						kind: entry.kind === "freeform" ? "freeform" : "selection",
						comment: pickString(entry.comment),
					};
				})
			: [];

		return {
			kind: "questionnaire",
			questionnaireDetails,
			additionalComments: pickString(raw.additionalComments),
		};
	}

	const selections = Array.isArray(raw.selections)
		? raw.selections.map(String)
		: raw.selection
			? [String(raw.selection)]
			: [];

	return {
		kind: "selection",
		selections,
		comment: pickString(raw.comment),
		additionalComments: pickString(raw.additionalComments),
	};
}

function pickString(raw: unknown): string | undefined {
	return raw ? String(raw) : undefined;
}
