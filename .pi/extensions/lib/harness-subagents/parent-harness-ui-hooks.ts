import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	appendPlanApprovalIfNew,
	getLatestRunContext,
	type HarnessRunContext,
	nowIso,
	type PlanUserApproval,
	planPacketSummary,
} from "../../../lib/harness-run-context.js";
import type { ParentHarnessUiHooks } from "./parent-harness-ui-bridge.js";

function persistRunContext(pi: ExtensionAPI, runCtx: HarnessRunContext): void {
	pi.appendEntry("harness-run-context", runCtx);
}

export function createParentHarnessUiHooks(
	pi: ExtensionAPI,
	getParentEntries: () => unknown[],
	projectRoot: string,
): ParentHarnessUiHooks {
	return {
		projectRoot,
		getParentEntries,
		getParentRunContext: () => getLatestRunContext(getParentEntries()),
		appendPlanDraft: (draft) => {
			const planId = String(draft.plan_packet.plan_id ?? "plan");
			const summary =
				draft.human_summary?.trim() || `Plan ${planId} — pending your approval`;
			pi.sendMessage({
				customType: "harness-plan-draft",
				content: summary,
				display: true,
				details: {
					schema_version: "1.0.0",
					plan_packet: draft.plan_packet,
					human_summary: draft.human_summary ?? null,
					shown_at: nowIso(),
				},
			});
		},
		onPlanApproval: (approval: PlanUserApproval) => {
			const entries = getParentEntries();
			const runCtx = getLatestRunContext(entries);
			appendPlanApprovalIfNew(
				(type, data) => pi.appendEntry(type, data),
				entries,
				approval,
				runCtx,
			);
		},
		onPlanCommitted: (runCtx, packet, planPath) => {
			persistRunContext(pi, runCtx);
			pi.appendEntry(
				"harness-plan-packet",
				planPacketSummary(packet, planPath, "ready"),
			);
		},
	};
}
