/**
 * harness-ask-user — structured user decisions for harness planning and setup.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { runAskUser } from "../lib/ask-user/index.js";
import { renderAskCall, renderAskResult } from "../lib/ask-user/render.js";
import {
	AskUserParamsSchema,
	PROMPT_GUIDELINES,
	PROMPT_SNIPPET,
} from "../lib/ask-user/schema.js";
import type { AskUserParams } from "../lib/ask-user/types.js";
import { claimHarnessGovernanceLoad } from "../lib/extension-load-guard.js";
import { setHarnessWaitingForUser } from "../lib/harness-subagent-progress.js";

// @ts-expect-error pi extensions run as ESM
const MODULE_URL = import.meta.url;

export default function harnessAskUser(pi: ExtensionAPI) {
	if (!claimHarnessGovernanceLoad("harness-ask-user", MODULE_URL)) return;
	pi.registerTool({
		name: "ask_user",
		label: "Ask User",
		description:
			"Ask the user a structured question with options. Use for ambiguous or high-impact harness decisions instead of guessing.",
		promptSnippet: PROMPT_SNIPPET,
		promptGuidelines: PROMPT_GUIDELINES,
		parameters: AskUserParamsSchema,

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			setHarnessWaitingForUser("ask_user");
			pi.events.emit("harness-waiting-for-user", { gate: "ask_user" });
			let result: Awaited<ReturnType<typeof runAskUser>>;
			try {
				result = await runAskUser(params as AskUserParams, {
					ui: ctx.ui,
					hasUI: ctx.hasUI,
					sessionName: undefined,
				});
			} finally {
				setHarnessWaitingForUser(null);
				pi.events.emit("harness-waiting-for-user", { gate: null });
			}

			if ("error" in result) {
				return {
					content: [{ type: "text", text: result.error }],
					details: result.details,
				};
			}

			return {
				content: result.content,
				details: result.details,
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
