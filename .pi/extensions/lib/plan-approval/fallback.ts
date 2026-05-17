import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { formatPlanPacketLines } from "./format-plan.js";
import type {
	PlanApprovalDialogResult,
	ValidatedApprovePlanParams,
} from "./types.js";

export async function runPlanApprovalFallback(
	ui: ExtensionUIContext,
	validated: ValidatedApprovePlanParams,
): Promise<PlanApprovalDialogResult> {
	const lines = formatPlanPacketLines(validated.plan_packet, 80);
	const body = lines.join("\n");
	const summary = validated.human_summary
		? `${validated.human_summary}\n\n`
		: "";
	const prompt = `${summary}${body}\n\nSelect: ${validated.options.map((o, i) => `${i + 1}. ${o.title}`).join(" | ")}`;
	const raw = await ui.input("Plan approval", prompt);
	if (!raw?.trim()) {
		return { response: null, cancelled: true };
	}
	const pick = raw.trim();
	const byIndex = Number.parseInt(pick, 10);
	if (
		Number.isFinite(byIndex) &&
		byIndex >= 1 &&
		byIndex <= validated.options.length
	) {
		return {
			response: {
				kind: "selection",
				selections: [validated.options[byIndex - 1].title],
			},
			cancelled: false,
		};
	}
	const match = validated.options.find(
		(o) => o.title.toLowerCase() === pick.toLowerCase(),
	);
	if (match) {
		return {
			response: { kind: "selection", selections: [match.title] },
			cancelled: false,
		};
	}
	return {
		response: { kind: "freeform", text: pick },
		cancelled: false,
	};
}
