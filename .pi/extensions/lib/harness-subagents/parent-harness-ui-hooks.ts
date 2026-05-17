import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	appendPlanApprovalIfNew,
	getLatestRunContext,
	type HarnessRunContext,
	nowIso,
	type PlanUserApproval,
	planPacketSummary,
} from "../../../lib/harness-run-context.js";
import { writePlanReviewMarkdown } from "../plan-approval/plan-review.js";
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
			const runCtx = getLatestRunContext(getParentEntries());
			void writePlanReviewMarkdown(projectRoot, runCtx, draft.plan_packet, {
				human_summary: draft.human_summary,
				status: "draft",
			}).then((reviewPath) => {
				if (!reviewPath) return;
				pi.sendMessage({
					customType: "harness-plan-review-path",
					content: `Editor review: ${reviewPath}`,
					display: true,
					details: {
						schema_version: "1.0.0",
						plan_review_path: reviewPath,
						plan_id: planId,
					},
				});
			});
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
