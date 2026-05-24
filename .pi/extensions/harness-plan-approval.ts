/**
 * harness-plan-approval — PlanPacket approval UI and transcript renderer for parent sessions.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import type { PlanPacketLike } from "../lib/harness-run-context.js";
import {
	appendPlanApprovalIfNew,
	getLatestRunContext,
	hasPlanUserApproval,
	parsePlanApprovalFromMessage,
	planPacketSummary,
} from "../lib/harness-run-context.js";
import { claimHarnessGovernanceLoad } from "../lib/extension-load-guard.js";
import {
	CREATE_PLAN_GUIDELINES,
	CREATE_PLAN_SNIPPET,
	executeCreatePlan,
	formatCreatePlanResultText,
} from "../lib/plan-approval/create-plan.js";
import {
	buildPlanApprovalMarkdown,
	runPlanApprovalDialog,
} from "../lib/plan-approval/dialog.js";
import { writePlanReviewMarkdown } from "../lib/plan-approval/plan-review.js";
import {
	renderApprovePlanCall,
	renderApprovePlanResult,
	renderHarnessPlanDraft,
} from "../lib/plan-approval/render.js";
import { resolveApprovePlanParamsFromDisk } from "../lib/plan-approval/resolve-disk.js";
import {
	ApprovePlanParamsSchema,
	CreatePlanParamsSchema,
	PROMPT_GUIDELINES,
	PROMPT_SNIPPET,
} from "../lib/plan-approval/schema.js";
import type {
	ApprovePlanParams,
	PlanApprovalDialogResult,
} from "../lib/plan-approval/types.js";
import {
	formatApprovePlanResultText,
	toApprovePlanToolDetails,
	validateApprovePlanParams,
} from "../lib/plan-approval/validate.js";
import { validatePlanApprovalReadiness } from "../lib/plan-approval-readiness.js";
import { validatePlanDebateGate } from "../lib/plan-debate-gate.js";

// @ts-expect-error pi extensions run as ESM
const MODULE_URL = import.meta.url;

export default function harnessPlanApproval(pi: ExtensionAPI) {
	if (!claimHarnessGovernanceLoad("harness-plan-approval", MODULE_URL)) return;
	pi.registerMessageRenderer(
		"harness-plan-draft",
		(message, _options, theme) => {
			const data = message.details as
				| {
						plan_packet?: unknown;
						human_summary?: string | null;
						plan_markdown?: string | null;
				  }
				| undefined;
			if (!data?.plan_packet) return undefined;
			const contentText =
				typeof message.content === "string" ? message.content : null;
			const lines = renderHarnessPlanDraft(
				{
					plan_packet: data.plan_packet as Parameters<
						typeof renderHarnessPlanDraft
					>[0]["plan_packet"],
					human_summary: data.human_summary,
					plan_markdown: data.plan_markdown,
				},
				120,
				theme,
				contentText,
			);
			return new Text(lines.join("\n"), 0, 0);
		},
	);

	pi.registerTool({
		name: "approve_plan",
		label: "Approve Plan",
		description:
			"Present a PlanPacket for user approval: full plan markdown in the transcript, then Approve / Request changes / Cancel via the same prompt as ask_user. Parent /harness-plan orchestrator calls this after decomposition, hypothesis, and parallel reviews.",
		promptSnippet: PROMPT_SNIPPET,
		promptGuidelines: PROMPT_GUIDELINES,
		parameters: ApprovePlanParamsSchema,

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const entries = ctx.sessionManager.getEntries();
			const projectRoot = process.cwd();
			const resolved = await resolveApprovePlanParamsFromDisk(
				params as ApprovePlanParams,
				entries,
				projectRoot,
			);
			if (!resolved.ok) {
				return {
					content: [{ type: "text", text: resolved.error }],
					details: {
						plan_packet: (params as ApprovePlanParams).plan_packet ?? {},
						options: [],
						response: null,
						cancelled: true,
					},
					isError: true,
				};
			}
			const validated = validateApprovePlanParams({
				...(params as ApprovePlanParams),
				plan_packet: resolved.plan_packet,
				research_brief:
					resolved.research_brief ??
					(params as ApprovePlanParams).research_brief,
			});
			if (typeof validated === "string") {
				return {
					content: [{ type: "text", text: validated }],
					details: {
						plan_packet: resolved.plan_packet,
						options: [],
						response: null,
						cancelled: true,
					},
				};
			}

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
							text: `Plan ${planId} already approved in this harness run. Proceed with /harness-run.`,
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
			const _summary =
				validated.human_summary?.trim() ||
				`Plan ${planId} — pending your approval`;
			const runCtx = getLatestRunContext(entries);
			const implWarnings: string[] = [];
			const risk = String(
				validated.plan_packet.risk_level ?? "med",
			).toLowerCase();
			if (runCtx?.run_id) {
				const readiness = await validatePlanApprovalReadiness(
					projectRoot,
					runCtx.run_id,
					{ risk_level: risk },
				);
				if (!readiness.ok) {
					return {
						content: [
							{
								type: "text",
								text: `approve_plan blocked — plan phase not ready:\n- ${readiness.errors.join("\n- ")}`,
							},
						],
						details: {
							plan_packet: validated.plan_packet,
							readiness,
							cancelled: true,
						},
						isError: true,
					};
				}
				implWarnings.push(...readiness.warnings);
			}
			if (runCtx?.run_id) {
				const gate = await validatePlanDebateGate(projectRoot, runCtx.run_id);
				if (!gate.ok) {
					return {
						content: [
							{
								type: "text",
								text: `approve_plan blocked — plan debate gate incomplete:\n- ${gate.errors.join("\n- ")}`,
							},
						],
						details: {
							plan_packet: validated.plan_packet,
							debate_gate: gate,
							cancelled: true,
						},
						isError: true,
					};
				}
			}
			const reviewPath = await writePlanReviewMarkdown(
				projectRoot,
				runCtx,
				validated.plan_packet,
				{
					human_summary: validated.human_summary,
					research_brief: validated.research_brief,
					status: "draft",
				},
			);
			const planMarkdown = buildPlanApprovalMarkdown(validated);
			const draftContent =
				reviewPath != null
					? `${planMarkdown}\n\n---\n\nEditor copy: \`${reviewPath}\``
					: planMarkdown;
			pi.sendMessage({
				customType: "harness-plan-draft",
				content: draftContent,
				display: true,
				details: {
					schema_version: "1.0.0",
					plan_packet: validated.plan_packet,
					human_summary: validated.human_summary ?? null,
					research_brief: validated.research_brief ?? null,
					plan_review_path: reviewPath,
					plan_markdown: planMarkdown,
					shown_at: new Date().toISOString(),
				},
			});

			const outcome: PlanApprovalDialogResult = await runPlanApprovalDialog(
				ctx.ui,
				validated,
				{ hasUI: ctx.hasUI },
			);

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
						research_brief: validated.research_brief,
						status: "approved",
					},
				);
			}

			const text = [
				formatApprovePlanResultText(outcome.response, outcome.cancelled),
				...implWarnings,
			]
				.filter(Boolean)
				.join("\n\n");
			return {
				content: [{ type: "text", text }],
				details: { ...details, implementation_warnings: implWarnings },
			};
		},

		renderCall(args, theme) {
			return renderApprovePlanCall(args, theme);
		},

		renderResult(result, options, theme) {
			return renderApprovePlanResult(result, options, theme);
		},
	});

	pi.registerTool({
		name: "create_plan",
		label: "Create Plan",
		description:
			"Write the approved PlanPacket to plan-packet.yaml for this harness run. Call only after approve_plan (Approve). Do not use write/edit.",
		promptSnippet: CREATE_PLAN_SNIPPET,
		promptGuidelines: CREATE_PLAN_GUIDELINES,
		parameters: CreatePlanParamsSchema,

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const entries = ctx.sessionManager.getEntries();
			const runCtx = getLatestRunContext(entries);
			const projectRoot = process.cwd();
			const resolved = await resolveApprovePlanParamsFromDisk(
				params as ApprovePlanParams,
				entries,
				projectRoot,
			);
			if (!resolved.ok) {
				return {
					content: [{ type: "text", text: resolved.error }],
					details: { error: resolved.error },
					isError: true,
				};
			}
			const result = await executeCreatePlan(resolved.plan_packet, {
				projectRoot,
				getParentEntries: () => entries,
				getSubagentEntries: () => entries,
				getParentRunContext: () => runCtx,
				onCommitted: (updated, packet, planPath) => {
					pi.appendEntry("harness-run-context", updated);
					pi.appendEntry(
						"harness-plan-packet",
						planPacketSummary(packet, planPath, "ready"),
					);
				},
			});

			const text = formatCreatePlanResultText(result);
			return {
				content: [{ type: "text", text }],
				details: result.ok
					? { plan_path: result.planPath, plan_id: result.planId }
					: { error: result.error },
				isError: !result.ok,
			};
		},

		renderCall(args, theme) {
			const packet = (args as { plan_packet?: PlanPacketLike }).plan_packet;
			const id = packet?.plan_id ?? "?";
			return new Text(theme.fg("accent", `create_plan: ${id}`), 0, 0);
		},

		renderResult(result, _options, theme) {
			const details = result.details as
				| { plan_path?: string; error?: string }
				| undefined;
			if (details?.error) {
				return new Text(
					theme.fg("error", details.error ?? "create_plan failed"),
					0,
					0,
				);
			}
			return new Text(
				theme.fg(
					"success",
					`Wrote ${details?.plan_path ?? "plan-packet.yaml"}`,
				),
				0,
				0,
			);
		},
	});
}
