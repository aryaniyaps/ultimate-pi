/**
 * Registers ask_user and approve_plan in subagent sessions, delegating UI to the parent harness session.
 */

import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "@sinclair/typebox";
import type {
	PlanPacketLike,
	PlanUserApproval,
} from "../../../lib/harness-run-context.js";
import { parsePlanApprovalFromMessage } from "../../../lib/harness-run-context.js";
import { runAskDialog } from "../ask-user/dialog.js";
import { runAskFallback } from "../ask-user/fallback.js";
import { renderAskCall, renderAskResult } from "../ask-user/render.js";
import {
	PROMPT_GUIDELINES as ASK_PROMPT_GUIDELINES,
	PROMPT_SNIPPET as ASK_PROMPT_SNIPPET,
	AskUserParamsSchema,
} from "../ask-user/schema.js";
import type { AskUserParams, DialogResult } from "../ask-user/types.js";
import {
	formatResultText,
	toToolDetails,
	validateAskParams,
} from "../ask-user/validate.js";
import {
	CREATE_PLAN_GUIDELINES,
	CREATE_PLAN_SNIPPET,
	executeCreatePlan,
	formatCreatePlanResultText,
} from "../plan-approval/create-plan.js";
import { runPlanApprovalDialog } from "../plan-approval/dialog.js";
import { runPlanApprovalFallback } from "../plan-approval/fallback.js";
import { writePlanReviewMarkdown } from "../plan-approval/plan-review.js";
import {
	renderApprovePlanCall,
	renderApprovePlanResult,
} from "../plan-approval/render.js";
import {
	ApprovePlanParamsSchema,
	PROMPT_GUIDELINES as PLAN_PROMPT_GUIDELINES,
	PROMPT_SNIPPET as PLAN_PROMPT_SNIPPET,
} from "../plan-approval/schema.js";
import type { ApprovePlanParams } from "../plan-approval/types.js";
import {
	formatApprovePlanResultText,
	toApprovePlanToolDetails,
	validateApprovePlanParams,
} from "../plan-approval/validate.js";

const HARNESS_UI_AGENT_TYPES = new Set([
	"harness/planner",
	"harness/evaluator",
	"harness/adversary",
	"harness/tie-breaker",
]);

export interface ParentHarnessUiHooks {
	projectRoot?: string;
	getParentEntries?: () => unknown[];
	getParentRunContext?: () =>
		| import("../../../lib/harness-run-context.js").HarnessRunContext
		| null;
	onPlanApproval?: (approval: PlanUserApproval) => void;
	appendPlanDraft?: (draft: {
		plan_packet: PlanPacketLike;
		human_summary?: string;
	}) => void;
	onPlanCommitted?: (
		runCtx: import("../../../lib/harness-run-context.js").HarnessRunContext,
		packet: PlanPacketLike,
		planPath: string,
	) => void;
}

const CreatePlanParamsSchema = Type.Object({
	plan_packet: Type.Object(
		{},
		{
			description:
				"Approved PlanPacket to persist (same object as approve_plan).",
		},
	),
});

const PLANNER_ONLY_AGENT = "harness/planner";

export function agentTypeAllowsParentHarnessUi(agentType: string): boolean {
	return HARNESS_UI_AGENT_TYPES.has(agentType);
}

/** @deprecated Use agentTypeAllowsParentHarnessUi */
export function agentTypeAllowsParentAskUser(agentType: string): boolean {
	return agentTypeAllowsParentHarnessUi(agentType);
}

function notifyPlanApproval(
	hooks: ParentHarnessUiHooks | undefined,
	details: unknown,
	toolName: "ask_user" | "approve_plan",
): void {
	if (!hooks?.onPlanApproval) return;
	const approval = parsePlanApprovalFromMessage({ toolName, details });
	if (approval) hooks.onPlanApproval(approval);
}

export function createParentHarnessUiBridgeFactory(
	parentCtx: ExtensionContext,
	agentType: string,
	hooks?: ParentHarnessUiHooks,
): ((pi: ExtensionAPI) => void) | null {
	if (!agentTypeAllowsParentHarnessUi(agentType)) {
		return null;
	}
	return (pi: ExtensionAPI) => {
		pi.registerTool({
			name: "ask_user",
			label: "Ask User",
			description:
				"Ask the user a structured question (parent session UI). Use for clarification — not final plan approval (use approve_plan).",
			promptSnippet: ASK_PROMPT_SNIPPET,
			promptGuidelines: ASK_PROMPT_GUIDELINES,
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
				notifyPlanApproval(hooks, details, "ask_user");
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

		if (agentType !== PLANNER_ONLY_AGENT) {
			return;
		}

		pi.registerTool({
			name: "approve_plan",
			label: "Approve Plan",
			description:
				"Present the full PlanPacket for user approval in the parent TUI (scrollable overlay).",
			promptSnippet: PLAN_PROMPT_SNIPPET,
			promptGuidelines: PLAN_PROMPT_GUIDELINES,
			parameters: ApprovePlanParamsSchema,
			async execute(_toolCallId, params, _signal, _onUpdate) {
				const validated = validateApprovePlanParams(
					params as ApprovePlanParams,
				);
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

				hooks?.appendPlanDraft?.({
					plan_packet: validated.plan_packet,
					human_summary: validated.human_summary,
				});

				let outcome: DialogResult;
				if (parentCtx.hasUI) {
					outcome = await runPlanApprovalDialog(parentCtx.ui, validated, {
						onMounted: () => {
							pi.events.emit("plan-approval:mounted", {});
						},
					});
				} else {
					outcome = await runPlanApprovalFallback(parentCtx.ui, validated);
				}
				const details = toApprovePlanToolDetails(
					validated,
					outcome.response,
					outcome.cancelled,
				);
				notifyPlanApproval(hooks, details, "approve_plan");
				const approved =
					!outcome.cancelled &&
					outcome.response?.kind === "selection" &&
					/^approve/i.test(outcome.response.selections[0] ?? "");
				if (approved) {
					const projectRoot = hooks?.projectRoot ?? parentCtx.cwd;
					const runCtx = hooks?.getParentRunContext?.() ?? null;
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

		pi.registerTool({
			name: "create_plan",
			label: "Create Plan",
			description:
				"Write the approved PlanPacket to the canonical plan-packet.json for this harness run. Requires approve_plan Approve first. Do not use write/edit.",
			promptSnippet: CREATE_PLAN_SNIPPET,
			promptGuidelines: CREATE_PLAN_GUIDELINES,
			parameters: CreatePlanParamsSchema,
			async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
				const validated = validateApprovePlanParams(
					params as ApprovePlanParams,
				);
				if (typeof validated === "string") {
					return {
						content: [{ type: "text", text: validated }],
						details: { error: validated },
					};
				}
				const projectRoot = hooks?.projectRoot ?? parentCtx.cwd;
				const parentEntries = hooks?.getParentEntries?.() ?? [];
				const subEntries = ctx.sessionManager.getEntries();
				const result = await executeCreatePlan(validated.plan_packet, {
					projectRoot,
					getParentEntries: () => parentEntries,
					getSubagentEntries: () => subEntries,
					getParentRunContext: () => hooks?.getParentRunContext?.() ?? null,
					onCommitted: (runCtx, packet, planPath) => {
						hooks?.onPlanCommitted?.(runCtx, packet, planPath);
					},
				});
				const text = formatCreatePlanResultText(result);
				return {
					content: [{ type: "text", text }],
					details: result.ok
						? {
								plan_path: result.planPath,
								plan_id: result.planId,
							}
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
						`Wrote ${details?.plan_path ?? "plan-packet.json"}`,
					),
					0,
					0,
				);
			},
		});
	};
}

/** @deprecated Use createParentHarnessUiBridgeFactory */
export function createParentAskUserBridgeFactory(
	parentCtx: ExtensionContext,
	agentType: string,
	hooks?: ParentHarnessUiHooks,
): ((pi: ExtensionAPI) => void) | null {
	return createParentHarnessUiBridgeFactory(parentCtx, agentType, hooks);
}
