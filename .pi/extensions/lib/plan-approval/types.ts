import type { PlanPacketLike } from "../../../lib/harness-run-context.js";
import type { AskResponse, DialogResult } from "../ask-user/types.js";

export const DEFAULT_PLAN_APPROVAL_OPTIONS = [
	"Approve",
	"Request changes",
	"Cancel",
] as const;

export interface ApprovePlanParams {
	plan_packet: PlanPacketLike;
	human_summary?: string;
	options?: Array<string | { title: string; description?: string }>;
	displayMode?: "overlay" | "inline";
}

export interface ValidatedApprovePlanParams {
	plan_packet: PlanPacketLike;
	human_summary?: string;
	options: { title: string; description?: string }[];
	displayMode: "overlay" | "inline";
}

export interface ApprovePlanToolDetails {
	plan_packet: PlanPacketLike;
	human_summary?: string;
	options: string[];
	response: AskResponse | null;
	cancelled: boolean;
}

export type PlanApprovalDialogResult = DialogResult;
