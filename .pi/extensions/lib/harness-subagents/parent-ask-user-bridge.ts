/**
 * Registers ask_user in subagent sessions, delegating UI to the parent harness session.
 */

import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { runAskDialog } from "../ask-user/dialog.js";
import { runAskFallback } from "../ask-user/fallback.js";
import { renderAskCall, renderAskResult } from "../ask-user/render.js";
import {
	AskUserParamsSchema,
	PROMPT_GUIDELINES,
	PROMPT_SNIPPET,
} from "../ask-user/schema.js";
import type { AskUserParams, DialogResult } from "../ask-user/types.js";
import {
	formatResultText,
	toToolDetails,
	validateAskParams,
} from "../ask-user/validate.js";

const ASK_USER_AGENT_TYPES = new Set([
	"harness/planner",
	"harness/evaluator",
	"harness/adversary",
	"harness/tie-breaker",
]);

export function agentTypeAllowsParentAskUser(agentType: string): boolean {
	return ASK_USER_AGENT_TYPES.has(agentType);
}

export function createParentAskUserBridgeFactory(
	parentCtx: ExtensionContext,
	agentType: string,
): ((pi: ExtensionAPI) => void) | null {
	if (!agentTypeAllowsParentAskUser(agentType)) {
		return null;
	}
	return (pi: ExtensionAPI) => {
		pi.registerTool({
			name: "ask_user",
			label: "Ask User",
			description:
				"Ask the user a structured question (parent session UI). Use for clarification and plan approval.",
			promptSnippet: PROMPT_SNIPPET,
			promptGuidelines: PROMPT_GUIDELINES,
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
