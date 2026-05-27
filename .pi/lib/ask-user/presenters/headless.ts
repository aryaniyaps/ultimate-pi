import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { FREEFORM_OPTION_TITLE } from "../constants.js";
import {
	detailFromFlatResult,
	mergeQuestionnaireResults,
	questionToFlatParams,
} from "../core/questionnaire.js";
import type { DialogResult, ValidatedAskParams } from "../types.js";

async function runFlatHeadless(
	ui: ExtensionUIContext,
	validated: ValidatedAskParams,
): Promise<DialogResult> {
	const { question, context, options, allowMultiple, allowFreeform } =
		validated;

	const title = context ? `${context}\n\n${question}` : question;
	const labels = options.map((o) => o.title);

	if (labels.length === 0) {
		if (!allowFreeform) {
			return { response: null, cancelled: true, ui_backend: "headless" };
		}
		const text = await ui.input(title, "");
		if (!text?.trim()) {
			return { response: null, cancelled: true, ui_backend: "headless" };
		}
		return {
			response: { kind: "freeform", text: text.trim() },
			cancelled: false,
			ui_backend: "headless",
		};
	}

	if (allowMultiple) {
		const selections: string[] = [];
		const remaining = [...labels];
		while (remaining.length > 0) {
			const pick = await ui.select(
				selections.length === 0
					? title
					: `${title}\n(selected: ${selections.join(", ")})`,
				[...remaining, "(done selecting)"],
			);
			if (!pick) {
				return { response: null, cancelled: true, ui_backend: "headless" };
			}
			if (pick === "(done selecting)") {
				break;
			}
			selections.push(pick);
			const idx = remaining.indexOf(pick);
			if (idx >= 0) remaining.splice(idx, 1);
		}
		if (selections.length === 0) {
			return { response: null, cancelled: true, ui_backend: "headless" };
		}
		return {
			response: { kind: "selection", selections },
			cancelled: false,
			ui_backend: "headless",
		};
	}

	const choices = allowFreeform ? [...labels, FREEFORM_OPTION_TITLE] : labels;
	const picked = await ui.select(title, choices);
	if (!picked) {
		return { response: null, cancelled: true, ui_backend: "headless" };
	}

	if (picked === FREEFORM_OPTION_TITLE) {
		const text = await ui.input(question, "");
		if (!text?.trim()) {
			return { response: null, cancelled: true, ui_backend: "headless" };
		}
		return {
			response: { kind: "freeform", text: text.trim() },
			cancelled: false,
			ui_backend: "headless",
		};
	}

	return {
		response: { kind: "selection", selections: [picked] },
		cancelled: false,
		ui_backend: "headless",
	};
}

async function runQuestionnaireHeadless(
	ui: ExtensionUIContext,
	validated: ValidatedAskParams,
): Promise<DialogResult> {
	const total = validated.questions.length;
	const details = [];
	let last: DialogResult | undefined;

	for (let i = 0; i < total; i++) {
		const q = validated.questions[i];
		const flat = questionToFlatParams(validated, q, i, total);
		const step = await runFlatHeadless(ui, flat);
		last = step;
		if (step.cancelled) {
			return { response: null, cancelled: true, ui_backend: "headless" };
		}
		const label = q.description ?? q.title;
		const detail = detailFromFlatResult(label, step);
		if (!detail) {
			if (!validated.allowSkip) {
				return { response: null, cancelled: true, ui_backend: "headless" };
			}
			continue;
		}
		details.push(detail);
	}

	return mergeQuestionnaireResults(details, last);
}

export async function runHeadlessPresenter(
	ui: ExtensionUIContext,
	validated: ValidatedAskParams,
): Promise<DialogResult> {
	if (validated.mode === "questionnaire") {
		return runQuestionnaireHeadless(ui, validated);
	}
	return runFlatHeadless(ui, validated);
}

/** @deprecated Use runHeadlessPresenter */
export const runAskFallback = runHeadlessPresenter;
