/**
 * AGT kill switch — arms on harness-abort and repeated policy denies (ADR 0047).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { KillSwitch } from "@microsoft/agent-governance-sdk";
import { isHarnessProjectEnabled } from "../lib/harness-project-config.js";
import {
	hasHarnessAbortSignal,
	userVisiblePromptSlice,
} from "../lib/harness-run-context.js";

const killSwitch = new KillSwitch({ enabled: true });

import { recordHarnessPolicyDeny } from "../lib/agt/kill-switch-state.js";

export function getHarnessKillSwitch(): KillSwitch {
	return killSwitch;
}

export function recordHarnessPolicyDenyForKillSwitch(sessionId: string): void {
	const n = recordHarnessPolicyDeny(sessionId);
	if (n >= 5) {
		void killSwitch.kill(sessionId, {
			reason: "Repeated harness policy denials",
		});
	}
}

export default function agtKillSwitch(pi: ExtensionAPI) {
	if (!isHarnessProjectEnabled()) return;

	pi.on("before_agent_start", async (event, ctx) => {
		const prompt = userVisiblePromptSlice(event.prompt);
		if (hasHarnessAbortSignal(prompt)) {
			const sessionId = ctx.sessionManager.getSessionId();
			await killSwitch.kill(sessionId, {
				reason: "harness-abort command",
			});
		}
		return undefined;
	});

	pi.on("tool_call", async (_event, ctx) => {
		const sessionId = ctx.sessionManager.getSessionId();
		const history = killSwitch.getHistory();
		const armed = history.some((h) => h.agentId === sessionId);
		if (armed) {
			return {
				block: true,
				reason:
					"agt-kill-switch: harness session halted after abort or repeated policy breaches.",
			};
		}
		return undefined;
	});
}
