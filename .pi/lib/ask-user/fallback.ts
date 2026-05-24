import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import type { DialogResult, ValidatedAskParams } from "./types.js";

export async function runAskFallback(
	ui: ExtensionUIContext,
	validated: ValidatedAskParams,
): Promise<DialogResult> {
	const { question, context, options, allowMultiple, allowFreeform } =
		validated;

	const title = context ? `${context}\n\n${question}` : question;
	const labels = options.map((o) => o.title);

	if (labels.length === 0) {
		if (!allowFreeform) {
			return { response: null, cancelled: true };
		}
		const text = await ui.input(title, "");
		if (!text?.trim()) {
			return { response: null, cancelled: true };
		}
		return {
			response: { kind: "freeform", text: text.trim() },
			cancelled: false,
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
				return { response: null, cancelled: true };
			}
			if (pick === "(done selecting)") {
				break;
			}
			selections.push(pick);
			const idx = remaining.indexOf(pick);
			if (idx >= 0) remaining.splice(idx, 1);
		}
		if (selections.length === 0) {
			return { response: null, cancelled: true };
		}
		return {
			response: { kind: "selection", selections },
			cancelled: false,
		};
	}

	const choices = allowFreeform ? [...labels, "Type something…"] : labels;
	const picked = await ui.select(title, choices);
	if (!picked) {
		return { response: null, cancelled: true };
	}

	if (picked === "Type something…") {
		const text = await ui.input(question, "");
		if (!text?.trim()) {
			return { response: null, cancelled: true };
		}
		return {
			response: { kind: "freeform", text: text.trim() },
			cancelled: false,
		};
	}

	return {
		response: { kind: "selection", selections: [picked] },
		cancelled: false,
	};
}
