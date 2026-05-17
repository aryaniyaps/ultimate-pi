import type { PlanPacketLike } from "../../../lib/harness-run-context.js";
import type { AskResponse, DialogResult } from "../ask-user/types.js";

export const DEFAULT_PLAN_APPROVAL_OPTIONS = [
	"Approve",
	"Request changes",
	"Cancel",
] as const;

/** Optional Darwin research artifacts from /harness-plan (not persisted in plan-packet.json). */
export interface PlanResearchBrief {
	decomposition?: Record<string, unknown> | null;
	hypothesis?: Record<string, unknown> | null;
	eval?: Record<string, unknown> | null;
}

export interface ApprovePlanParams {
	plan_packet: PlanPacketLike;
	human_summary?: string;
	research_brief?: PlanResearchBrief | null;
	options?: Array<string | { title: string; description?: string }>;
	displayMode?: "overlay" | "inline";
}

export interface ValidatedApprovePlanParams {
	plan_packet: PlanPacketLike;
	human_summary?: string;
	research_brief?: PlanResearchBrief | null;
	options: { title: string; description?: string }[];
	displayMode: "overlay" | "inline";
}

export interface ApprovePlanToolDetails {
	plan_packet: PlanPacketLike;
	human_summary?: string;
	research_brief?: PlanResearchBrief | null;
	options: string[];
	response: AskResponse | null;
	cancelled: boolean;
}

export type PlanApprovalDialogResult = DialogResult;
