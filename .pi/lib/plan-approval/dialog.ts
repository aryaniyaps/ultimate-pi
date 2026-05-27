import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { runAskDialog } from "../ask-user/dialog.js";
import { runAskFallback } from "../ask-user/fallback.js";
import type { ValidatedAskParams } from "../ask-user/types.js";
import { formatPlanPacketMarkdown } from "./plan-review.js";
import type {
	PlanApprovalDialogResult,
	ValidatedApprovePlanParams,
} from "./types.js";

export type RunPlanApprovalDialogOptions = {
	onMounted?: () => void;
	hasUI?: boolean;
};

/** Full plan body shown in the transcript before the approval prompt. */
export function buildPlanApprovalMarkdown(
	validated: ValidatedApprovePlanParams,
): string {
	return formatPlanPacketMarkdown(validated.plan_packet, {
		human_summary: validated.human_summary,
		status: "draft",
		research_brief: validated.research_brief,
	}).trim();
}

function toAskParams(
	validated: ValidatedApprovePlanParams,
): ValidatedAskParams {
	return {
		question: "How would you like to proceed with this harness plan?",
		context: buildPlanApprovalMarkdown(validated),
		contextFormat: "markdown",
		options: validated.options,
		questions: [],
		mode: "flat",
		allowMultiple: false,
		allowFreeform: false,
		allowComment: false,
		allowSkip: false,
		// Inline prompt below the plan — no full-screen overlay.
		displayMode: "inline",
	};
}

export async function runPlanApprovalDialog(
	ui: ExtensionUIContext,
	validated: ValidatedApprovePlanParams,
	options?: RunPlanApprovalDialogOptions,
): Promise<PlanApprovalDialogResult> {
	options?.onMounted?.();
	const askParams = toAskParams(validated);
	if (options?.hasUI === false) {
		return runAskFallback(ui, askParams);
	}
	return runAskDialog(ui, askParams);
}
