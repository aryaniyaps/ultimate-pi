import { formatResultText } from "../ask-user/format.js";
import type { AskResponse } from "../ask-user/types.js";
import {
	type PlanPacketLike,
	validatePlanPacket,
} from "../harness-run-context.js";
import type {
	ApprovePlanParams,
	ApprovePlanToolDetails,
	ValidatedApprovePlanParams,
} from "./types.js";
import { DEFAULT_PLAN_APPROVAL_OPTIONS } from "./types.js";

export function validateApprovePlanParams(
	params: ApprovePlanParams,
): ValidatedApprovePlanParams | string {
	const packet = params.plan_packet;
	if (!packet || typeof packet !== "object" || !packet.plan_id) {
		return "approve_plan: plan_packet must be resolved from disk before validate (use resolveApprovePlanParamsFromDisk).";
	}
	const validation = validatePlanPacket(packet as PlanPacketLike);
	if (!validation.valid) {
		return `approve_plan: invalid plan_packet — ${validation.errors.join("; ")}`;
	}
	const rawOptions = params.options;
	const options =
		rawOptions && rawOptions.length > 0
			? rawOptions.map((o) =>
					typeof o === "string"
						? { title: o }
						: { title: o.title, description: o.description },
				)
			: DEFAULT_PLAN_APPROVAL_OPTIONS.map((title) => ({ title }));
	return {
		plan_packet: packet as PlanPacketLike,
		human_summary: params.human_summary?.trim() || undefined,
		research_brief: params.research_brief ?? undefined,
		options,
		displayMode: params.displayMode ?? "inline",
	};
}

export function toApprovePlanToolDetails(
	validated: ValidatedApprovePlanParams,
	response: AskResponse | null,
	cancelled: boolean,
): ApprovePlanToolDetails {
	return {
		plan_packet: validated.plan_packet,
		human_summary: validated.human_summary,
		research_brief: validated.research_brief ?? null,
		options: validated.options.map((o) => o.title),
		response,
		cancelled,
	};
}

export function formatApprovePlanResultText(
	response: AskResponse | null,
	cancelled: boolean,
): string {
	return formatResultText(response, cancelled);
}
