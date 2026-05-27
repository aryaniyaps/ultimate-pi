import type { ValidatedAskParams } from "../types.js";
import type { GlimpseAskUserPayload } from "./glimpse-payload.js";

export function buildGlimpsePayload(
	validated: ValidatedAskParams,
	sessionName?: string,
): GlimpseAskUserPayload {
	const hasQuestions = validated.mode === "questionnaire";
	const hasOptions = validated.options.length > 0;

	let payloadType: GlimpseAskUserPayload["type"];
	if (hasQuestions) {
		payloadType = "questionnaire";
	} else if (!hasOptions) {
		payloadType = "freeform";
	} else if (validated.allowMultiple) {
		payloadType = "multi-select";
	} else {
		payloadType = "single-select";
	}

	let question = validated.question;
	let context = validated.context;
	if (!context && validated.question.length > 120) {
		const match = validated.question.match(/^(.+?[.?!])(\s+|$)/);
		if (match && match[0].length < validated.question.length) {
			question = match[1].trim();
			context = validated.question.slice(match[0].length).trim();
		}
	}

	return {
		type: payloadType,
		question,
		context,
		contextFormat: validated.contextFormat,
		options: validated.options.map((o) => ({
			title: o.title,
			description: o.description,
			recommended: o.recommended,
		})),
		questions: validated.questions.map((q) => ({
			title: q.title,
			description: q.description,
			allowMultiple: q.allowMultiple,
			options: q.options.map((o) => ({
				title: o.title,
				description: o.description,
				recommended: o.recommended,
			})),
		})),
		allowMultiple: validated.allowMultiple,
		allowFreeform: validated.allowFreeform,
		allowComment: validated.allowComment,
		allowSkip: validated.allowSkip,
		sessionName,
	};
}
