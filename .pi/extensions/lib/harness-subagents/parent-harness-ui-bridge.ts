/**
 * Registers ask_user in subagent sessions, delegating UI to the parent harness session.
 */

import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type {
	PlanPacketLike,
	PlanUserApproval,
} from "../../../lib/harness-run-context.js";
import { parsePlanApprovalFromMessage } from "../../../lib/harness-run-context.js";
import { runAskDialog } from "../ask-user/dialog.js";
import { runAskFallback } from "../ask-user/fallback.js";
import { renderAskCall, renderAskResult } from "../ask-user/render.js";
import {
	PROMPT_GUIDELINES as ASK_PROMPT_GUIDELINES,
	PROMPT_SNIPPET as ASK_PROMPT_SNIPPET,
	AskUserParamsSchema,
} from "../ask-user/schema.js";
import type { AskUserParams, DialogResult } from "../ask-user/types.js";
import {
	formatResultText,
	toToolDetails,
	validateAskParams,
} from "../ask-user/validate.js";

const HARNESS_UI_AGENT_TYPES = new Set([
	"harness/evaluator",
	"harness/adversary",
	"harness/tie-breaker",
]);

export interface ParentHarnessUiHooks {
	projectRoot?: string;
	getParentEntries?: () => unknown[];
	getParentRunContext?: () =>
		| import("../../../lib/harness-run-context.js").HarnessRunContext
		| null;
	onPlanApproval?: (approval: PlanUserApproval) => void;
	appendPlanDraft?: (draft: {
		plan_packet: PlanPacketLike;
		human_summary?: string;
	}) => void;
	onPlanCommitted?: (
		runCtx: import("../../../lib/harness-run-context.js").HarnessRunContext,
		packet: PlanPacketLike,
		planPath: string,
	) => void;
}

export function agentTypeAllowsParentHarnessUi(agentType: string): boolean {
	return HARNESS_UI_AGENT_TYPES.has(agentType);
}

/** @deprecated Use agentTypeAllowsParentHarnessUi */
export function agentTypeAllowsParentAskUser(agentType: string): boolean {
	return agentTypeAllowsParentHarnessUi(agentType);
}

function notifyPlanApproval(
	hooks: ParentHarnessUiHooks | undefined,
	details: unknown,
	toolName: "ask_user" | "approve_plan",
): void {
	if (!hooks?.onPlanApproval) return;
	const approval = parsePlanApprovalFromMessage({ toolName, details });
	if (approval) hooks.onPlanApproval(approval);
}

export function createParentHarnessUiBridgeFactory(
	parentCtx: ExtensionContext,
	agentType: string,
	hooks?: ParentHarnessUiHooks,
): ((pi: ExtensionAPI) => void) | null {
	if (!agentTypeAllowsParentHarnessUi(agentType)) {
		return null;
	}
	return (pi: ExtensionAPI) => {
		pi.registerTool({
			name: "ask_user",
			label: "Ask User",
			description:
				"Ask the user a structured question (parent session UI). Plan approval uses approve_plan on the parent orchestrator only.",
			promptSnippet: ASK_PROMPT_SNIPPET,
			promptGuidelines: ASK_PROMPT_GUIDELINES,
			parameters: AskUserParamsSchema,
			async execute(_toolCallId, params, _signal, _onUpdate) {
				const validated = validateAskParams(params as AskUserParams);
				if (typeof validated === "string") {
					return {
						content: [{ type: "text", text: validated }],
						details: {
							question: params.question ?? "",
							options: [],
							response: null,
							cancelled: true,
						},
					};
				}
				let outcome: DialogResult;
				if (parentCtx.hasUI) {
					outcome = await runAskDialog(parentCtx.ui, validated);
				} else {
					outcome = await runAskFallback(parentCtx.ui, validated);
				}
				const details = toToolDetails(
					validated,
					outcome.response,
					outcome.cancelled,
				);
				notifyPlanApproval(hooks, details, "ask_user");
				const text = formatResultText(outcome.response, outcome.cancelled);
				return {
					content: [{ type: "text", text }],
					details,
				};
			},
			renderCall(args, theme) {
				return renderAskCall(args, theme);
			},
			renderResult(result, options, theme) {
				return renderAskResult(result, options, theme);
			},
		});
	};
}

/** @deprecated Use createParentHarnessUiBridgeFactory */
export function createParentAskUserBridgeFactory(
	parentCtx: ExtensionContext,
	agentType: string,
	hooks?: ParentHarnessUiHooks,
): ((pi: ExtensionAPI) => void) | null {
	return createParentHarnessUiBridgeFactory(parentCtx, agentType, hooks);
}
