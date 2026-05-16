/**
 * harness-ask-user — structured user decisions for harness planning and setup.
 * Design references: pi-ask-user, @pi-unipi/ask-user, rpiv-ask-user-question (not vendored).
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { runAskDialog } from "./lib/ask-user/dialog.js";
import { runAskFallback } from "./lib/ask-user/fallback.js";
import { renderAskCall, renderAskResult } from "./lib/ask-user/render.js";
import {
	AskUserParamsSchema,
	PROMPT_GUIDELINES,
	PROMPT_SNIPPET,
} from "./lib/ask-user/schema.js";
import type { AskUserParams, DialogResult } from "./lib/ask-user/types.js";
import {
	formatResultText,
	toToolDetails,
	validateAskParams,
} from "./lib/ask-user/validate.js";

export default function harnessAskUser(pi: ExtensionAPI) {
	pi.registerTool({
		name: "ask_user",
		label: "Ask User",
		description:
			"Ask the user a structured question with options. Use for ambiguous or high-impact harness decisions instead of guessing.",
		promptSnippet: PROMPT_SNIPPET,
		promptGuidelines: PROMPT_GUIDELINES,
		parameters: AskUserParamsSchema,

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
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
			if (ctx.hasUI) {
				outcome = await runAskDialog(ctx.ui, validated);
			} else {
				outcome = await runAskFallback(ctx.ui, validated);
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
}
