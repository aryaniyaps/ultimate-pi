/**
 * AGT PromptDefense heuristics on harness slash commands (ADR 0047).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { PromptDefenseEvaluator } from "@microsoft/agent-governance-sdk";
import { isHarnessProjectEnabled } from "../lib/harness-project-config.js";
import { userVisiblePromptSlice } from "../lib/harness-run-context.js";

const evaluator = new PromptDefenseEvaluator({ minGrade: "D" });

export default function agtPromptGuard(pi: ExtensionAPI) {
	if (!isHarnessProjectEnabled()) return;

	pi.on("before_agent_start", async (event) => {
		const prompt = userVisiblePromptSlice(event.prompt);
		if (!prompt.trim()) return undefined;
		if (!/\/harness-/.test(prompt)) return undefined;

		const report = evaluator.evaluate(prompt);
		if (report.isBlocking("D")) {
			return {
				message: {
					customType: "harness-policy-violation",
					display: true,
					content: `agt-prompt-guard: prompt defense grade ${report.grade} (${report.score}). Missing defenses: ${report.missing.join(", ") || "see findings"}.`,
				},
			};
		}
		return undefined;
	});
}
