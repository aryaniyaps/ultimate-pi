/**
 * harness-plan-approval — PlanPacket approval UI and transcript renderer for parent sessions.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import {
	appendPlanApprovalIfNew,
	getLatestRunContext,
	hasPlanUserApproval,
	parsePlanApprovalFromMessage,
} from "../lib/harness-run-context.js";
import { claimExtensionLoad } from "./lib/extension-load-guard.js";
import { runPlanApprovalDialog } from "./lib/plan-approval/dialog.js";
import { runPlanApprovalFallback } from "./lib/plan-approval/fallback.js";
import { writePlanReviewMarkdown } from "./lib/plan-approval/plan-review.js";
import {
	renderApprovePlanCall,
	renderApprovePlanResult,
	renderHarnessPlanDraft,
} from "./lib/plan-approval/render.js";
import {
	ApprovePlanParamsSchema,
	PROMPT_GUIDELINES,
	PROMPT_SNIPPET,
} from "./lib/plan-approval/schema.js";
import type {
	ApprovePlanParams,
	PlanApprovalDialogResult,
} from "./lib/plan-approval/types.js";
import {
	formatApprovePlanResultText,
	toApprovePlanToolDetails,
	validateApprovePlanParams,
} from "./lib/plan-approval/validate.js";

// @ts-expect-error pi extensions run as ESM
const MODULE_URL = import.meta.url;

export default function harnessPlanApproval(pi: ExtensionAPI) {
	if (!claimExtensionLoad("harness-plan-approval", MODULE_URL)) return;
	pi.registerMessageRenderer(
		"harness-plan-draft",
		(message, _options, theme) => {
			const data = message.details as
				| {
						plan_packet?: unknown;
						human_summary?: string | null;
				  }
				| undefined;
			if (!data?.plan_packet) return undefined;
			const lines = renderHarnessPlanDraft(
				{
					plan_packet: data.plan_packet as Parameters<
						typeof renderHarnessPlanDraft
					>[0]["plan_packet"],
					human_summary: data.human_summary,
				},
				80,
				theme,
			);
			return new Text(lines.join("\n"), 0, 0);
		},
	);

	pi.registerTool({
		name: "approve_plan",
		label: "Approve Plan",
		description:
			"Present a PlanPacket for user approval with a scrollable plan view. Planners should prefer the subagent bridge; this registers the tool on parent sessions for non-interactive fallback.",
		promptSnippet: PROMPT_SNIPPET,
		promptGuidelines: PROMPT_GUIDELINES,
		parameters: ApprovePlanParamsSchema,

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const validated = validateApprovePlanParams(params as ApprovePlanParams);
			if (typeof validated === "string") {
				return {
					content: [{ type: "text", text: validated }],
					details: {
						plan_packet: (params as ApprovePlanParams).plan_packet ?? {},
						options: [],
						response: null,
						cancelled: true,
					},
				};
			}

			const entries = ctx.sessionManager.getEntries();
			if (
				hasPlanUserApproval(entries, {
					sincePlanCommand: true,
					planId: validated.plan_packet.plan_id ?? null,
				})
			) {
				const planId = String(validated.plan_packet.plan_id ?? "plan");
				return {
					content: [
						{
							type: "text",
							text: `Plan ${planId} already approved in this harness run (planner subagent). Proceed with /harness-run.`,
						},
					],
					details: {
						plan_packet: validated.plan_packet,
						options: validated.options,
						response: {
							kind: "selection",
							selections: ["Approve"],
						},
						cancelled: false,
					},
				};
			}

			const planId = String(validated.plan_packet.plan_id ?? "plan");
			const summary =
				validated.human_summary?.trim() ||
				`Plan ${planId} — pending your approval`;
			const runCtx = getLatestRunContext(entries);
			const projectRoot = process.cwd();
			const reviewPath = await writePlanReviewMarkdown(
				projectRoot,
				runCtx,
				validated.plan_packet,
				{
					human_summary: validated.human_summary,
					status: "draft",
				},
			);
			const draftContent =
				reviewPath != null
					? `${summary}\nEditor review: ${reviewPath}`
					: summary;
			pi.sendMessage({
				customType: "harness-plan-draft",
				content: draftContent,
				display: true,
				details: {
					schema_version: "1.0.0",
					plan_packet: validated.plan_packet,
					human_summary: validated.human_summary ?? null,
					plan_review_path: reviewPath,
					shown_at: new Date().toISOString(),
				},
			});

			let outcome: PlanApprovalDialogResult;
			if (ctx.hasUI) {
				outcome = await runPlanApprovalDialog(ctx.ui, validated, {
					onMounted: () => {
						pi.events.emit("plan-approval:mounted", {});
					},
				});
			} else {
				outcome = await runPlanApprovalFallback(ctx.ui, validated);
			}

			const details = toApprovePlanToolDetails(
				validated,
				outcome.response,
				outcome.cancelled,
			);
			const approval = parsePlanApprovalFromMessage({
				toolName: "approve_plan",
				details,
			});
			if (approval) {
				const runCtx = getLatestRunContext(entries);
				appendPlanApprovalIfNew(
					(type, data) => pi.appendEntry(type, data),
					entries,
					approval,
					runCtx,
				);
			}

			const approved =
				!outcome.cancelled &&
				outcome.response?.kind === "selection" &&
				/^approve/i.test(outcome.response.selections[0] ?? "");
			if (approved && runCtx) {
				await writePlanReviewMarkdown(
					projectRoot,
					runCtx,
					validated.plan_packet,
					{
						human_summary: validated.human_summary,
						status: "approved",
					},
				);
			}

			const text = formatApprovePlanResultText(
				outcome.response,
				outcome.cancelled,
			);
			return {
				content: [{ type: "text", text }],
				details,
			};
		},

		renderCall(args, theme) {
			return renderApprovePlanCall(args, theme);
		},

		renderResult(result, options, theme) {
			return renderApprovePlanResult(result, options, theme);
		},
	});
}
