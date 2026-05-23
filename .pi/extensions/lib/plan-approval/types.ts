import type { PlanPacketLike } from "../../../lib/harness-run-context.js";
import type { AskResponse, DialogResult } from "../ask-user/types.js";

export const DEFAULT_PLAN_APPROVAL_OPTIONS = [
	"Approve",
	"Request changes",
	"Cancel",
] as const;

/** Optional Darwin research artifacts from /harness-plan (research-brief.yaml, not in plan-packet). */
export interface PlanResearchBrief {
	decomposition?: Record<string, unknown> | null;
	hypothesis?: Record<string, unknown> | null;
	eval?: Record<string, unknown> | null;
	stack?: Record<string, unknown> | null;
	implementation?: Record<string, unknown> | null;
	debate?: {
		rounds?: Record<string, unknown>[];
		hypothesis_validations?: Record<string, unknown>[];
	} | null;
	dag_validation?: Record<string, unknown> | null;
}

export interface ApprovePlanParams {
	plan_packet?: PlanPacketLike;
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
