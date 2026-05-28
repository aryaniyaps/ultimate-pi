import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { formatResultText, toToolDetails } from "./format.js";
import {
	isHarnessNonInteractive,
	isPlanApprovalAskUser,
	nonInteractiveAskUserResult,
} from "./policy.js";
import { presentAskUser } from "./presenters/select.js";
import type { AskUserParams, RunAskUserResult } from "./types.js";
import { validateAskParams } from "./validate.js";

export { buildGlimpsePayload } from "./contracts/glimpse-payload-build.js";
export { formatResultText, toToolDetails } from "./format.js";
export { applyAskUserToTaskClarification } from "./merge-task-clarification.js";
export {
	assertSubagentCannotAskUser,
	isCursorAgentContext,
	isHarnessNonInteractive,
	isPlanApprovalAskUser,
	nonInteractiveAskUserResult,
	PLAN_APPROVE_OPTION,
	PLAN_CANCEL_OPTION,
	shouldPreferTuiOverGlimpse,
} from "./policy.js";
export {
	glimpseHealthCheck,
	isGlimpseAvailable,
} from "./presenters/glimpse.js";
export {
	AskUserParamsSchema,
	PROMPT_GUIDELINES,
	PROMPT_SNIPPET,
} from "./schema.js";
export type {
	AskResponse,
	AskToolDetails,
	AskUserParams,
	DialogResult,
	ValidatedAskParams,
} from "./types.js";
export { normalizeOption, validateAskParams } from "./validate.js";

export interface RunAskUserContext {
	ui: ExtensionUIContext;
	hasUI: boolean;
	sessionName?: string;
}

export async function runAskUser(
	params: AskUserParams,
	ctx: RunAskUserContext,
): Promise<
	| RunAskUserResult
	| { error: string; details: Partial<import("./types.js").AskToolDetails> }
> {
	if (isPlanApprovalAskUser(params)) {
		return {
			error:
				"ask_user must not be used for plan approval — call approve_plan with the PlanPacket.",
			details: {
				question: params.question ?? "",
				options: [],
				response: null,
				cancelled: true,
				ui_backend: "headless",
			},
		};
	}

	if (isHarnessNonInteractive()) {
		const blocked = nonInteractiveAskUserResult(params.question ?? "");
		return {
			error: blocked.text,
			details: blocked.details as import("./types.js").AskToolDetails,
		};
	}

	const validated = validateAskParams(params);
	if (typeof validated === "string") {
		return {
			error: validated,
			details: {
				question: params.question ?? "",
				options: [],
				response: null,
				cancelled: true,
				ui_backend: "headless",
			},
		};
	}

	const outcome = await presentAskUser(validated, {
		ui: ctx.ui,
		hasUI: ctx.hasUI,
		sessionName: ctx.sessionName,
	});

	const details = toToolDetails(
		validated,
		outcome.response,
		outcome.cancelled,
		outcome.ui_backend,
		{
			ui_degraded: outcome.ui_degraded,
		},
	);

	const text = formatResultText(outcome.response, outcome.cancelled, {
		ui_degraded: outcome.ui_degraded,
	});

	return {
		content: [{ type: "text", text }],
		details,
	};
}
