/**
 * AGT PromptDefense heuristics on harness slash commands (ADR 0047).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { PromptDefenseEvaluator } from "@microsoft/agent-governance-sdk";
import { isHarnessNonInteractive } from "../lib/ask-user/policy.js";
import { isHarnessProjectEnabled } from "../lib/harness-project-config.js";
import { harnessSlashCommandLineForPolicy } from "../lib/harness-run-context.js";

const evaluator = new PromptDefenseEvaluator({ minGrade: "D" });

export default function agtPromptGuard(pi: ExtensionAPI) {
	if (!isHarnessProjectEnabled()) return;

	pi.on("before_agent_start", async (event, ctx) => {
		const commandLine = harnessSlashCommandLineForPolicy(
			event.prompt,
			ctx.sessionManager.getEntries(),
		);
		if (!commandLine) return undefined;

		const report = evaluator.evaluate(commandLine);
		if (report.isBlocking("D")) {
			if (isHarnessNonInteractive()) {
				pi.appendEntry("harness-policy-violation", {
					source: "agt-prompt-guard",
					display: false,
					grade: report.grade,
					score: report.score,
					missing: report.missing,
					advisory: true,
				});
				return undefined;
			}
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
