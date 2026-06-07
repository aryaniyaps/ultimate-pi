/**
 * Human-in-the-loop gates for /harness-plan — Phase 0 ask_user and Phase 6 approve_plan.
 */

import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import {
	isHarnessNonInteractive,
	isPlanApprovalAskUser,
} from "./ask-user/policy.js";
import {
	isHarnessPlanAutoApproveEnabled,
} from "./harness-auto-approve.js";
import {
	hasPlanUserApproval,
	indexOfLastPlanCommand,
} from "./harness-run-context.js";
import { validatePlanApprovalReadiness } from "./plan-approval-readiness.js";
import { loadPlanDebateEligibilitySnapshot } from "./plan-debate-eligibility-snapshot.js";
import {
	buildPlanDebateGateRecovery,
	validatePlanDebateGate,
} from "./plan-debate-gate.js";

export { canAutoApprovePlan } from "./harness-auto-approve.js";

import {
	isTaskClarificationReady,
	readTaskClarificationDoc,
	type TaskClarificationReadiness,
	validateTaskClarificationDoc,
} from "./plan-task-clarification.js";

const EXPLICIT_ACCEPTANCE_RE =
	/\b(acceptance|success criteria|definition of done|done when|must (pass|satisfy)|out of scope|in scope)\b/i;

const QA_SMOKE_TASK_RE =
	/\b(qa smoke|e2e-last-run|evals\/smoke\/|iso-?8601.*timestamp|append one .* timestamp line)\b/i;

type SessionEntryLike = {
	type?: string;
	customType?: string;
	data?: unknown;
	message?: {
		role?: string;
		toolName?: string;
		details?: unknown;
		content?: string | unknown[];
	};
};

function isNonInteractivePlan(): boolean {
	return (
		process.env.HARNESS_PLAN_NONINTERACTIVE === "1" || isHarnessNonInteractive()
	);
}

function askUserCallWasTaskClarification(details: unknown): boolean {
	if (!details || typeof details !== "object") return false;
	const d = details as { cancelled?: boolean; input?: unknown };
	if (d.cancelled) return false;
	const input = d.input as
		| { question?: string; options?: unknown[]; questions?: unknown[] }
		| undefined;
	if (!input) return true;
	return !isPlanApprovalAskUser(input);
}

export function hasTaskClarificationAskUserSincePlanCommand(
	entries: unknown[],
): boolean {
	const since = Math.max(0, indexOfLastPlanCommand(entries));
	for (let i = since; i < entries.length; i++) {
		const entry = entries[i] as SessionEntryLike;
		if (
			entry.type === "custom" &&
			entry.customType === "harness-task-clarification-engagement"
		) {
			return true;
		}
		if (entry.type !== "message" || entry.message?.role !== "toolResult") {
			continue;
		}
		if (entry.message.toolName !== "ask_user") continue;
		if (askUserCallWasTaskClarification(entry.message.details)) {
			return true;
		}
	}
	return false;
}

export function hasClarificationFollowUpUserMessage(
	entries: unknown[],
): boolean {
	const since = Math.max(0, indexOfLastPlanCommand(entries));
	for (let i = since; i < entries.length; i++) {
		const entry = entries[i] as SessionEntryLike;
		if (entry.type !== "message" || entry.message?.role !== "user") continue;
		const content = entry.message.content;
		const text =
			typeof content === "string"
				? content.trim()
				: Array.isArray(content)
					? content
							.filter(
								(c): c is { type: string; text?: string } =>
									typeof c === "object" && c !== null && "type" in c,
							)
							.map((c) => c.text ?? "")
							.join("")
							.trim()
					: "";
		if (!text || text.startsWith("/")) continue;
		return true;
	}
	return false;
}

export function isExplicitTaskAcceptance(taskSummary: string): boolean {
	const t = taskSummary.trim();
	if (t.length < 24) return false;
	if (QA_SMOKE_TASK_RE.test(t)) return true;
	return EXPLICIT_ACCEPTANCE_RE.test(t);
}

export interface TaskClarificationHumanGateResult {
	ok: boolean;
	errors: string[];
}

export function validateTaskClarificationHumanGate(
	entries: unknown[],
	doc: Record<string, unknown> | null,
	opts?: {
		quick?: boolean;
		taskSummary?: string;
		allowFollowUpMessage?: boolean;
	},
): TaskClarificationHumanGateResult {
	const errors: string[] = [];
	const status = String(doc?.status ?? "").toLowerCase();
	if (status !== "ready") {
		return { ok: true, errors };
	}

	const engagement = doc?.user_engagement as { source?: string } | undefined;
	if (engagement?.source === "ask_user") {
		return { ok: true, errors };
	}

	if (process.env.HARNESS_PLAN_NONINTERACTIVE === "1") {
		return { ok: true, errors };
	}

	if (isHarnessPlanAutoApproveEnabled() && isHarnessNonInteractive()) {
		return { ok: true, errors };
	}

	if (hasTaskClarificationAskUserSincePlanCommand(entries)) {
		return { ok: true, errors };
	}

	if (
		opts?.allowFollowUpMessage &&
		hasClarificationFollowUpUserMessage(entries)
	) {
		return { ok: true, errors };
	}

	if (opts?.quick && isExplicitTaskAcceptance(opts.taskSummary ?? "")) {
		return { ok: true, errors };
	}

	errors.push(
		"Phase 0 requires ask_user before task-clarification status: ready. Call ask_user (harness-decisions skill), merge answers, then harness_artifact_ready.",
	);
	return { ok: false, errors };
}

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

export interface PlanHumanGateStatus {
	phase0Ready: boolean;
	phase0NeedsAskUser: boolean;
	debateComplete: boolean;
	debateRequired: boolean;
	approvalRequired: boolean;
	approvalRecorded: boolean;
	nextRequiredAction: string | null;
	/** Actionable Review Gate recovery when debateRequired. */
	debateRecoveryHint: string | null;
}

export async function resolvePlanHumanGateStatus(
	projectRoot: string,
	runId: string,
	entries: unknown[],
	opts?: { quick?: boolean; taskSummary?: string; lastOutcome?: string | null },
): Promise<PlanHumanGateStatus> {
	const runDir = join(projectRoot, ".pi", "harness", "runs", runId);
	const clar = await isTaskClarificationReady(runDir);
	const clarDoc = clar.ok ? await readTaskClarificationDoc(runDir) : null;
	const humanGate = validateTaskClarificationHumanGate(entries, clarDoc, {
		quick: opts?.quick,
		taskSummary: opts?.taskSummary,
		allowFollowUpMessage: opts?.lastOutcome === "needs_clarification",
	});
	const phase0Ready = clar.ok && humanGate.ok;
	const phase0NeedsAskUser = clar.ok && !humanGate.ok;
	const approvalRecorded = hasPlanUserApproval(entries, {
		sincePlanCommand: true,
	});
	const dagPath = join(runDir, "plan-packet.yaml");
	const hasPacket = await fileExists(dagPath);
	const messengerPath = join(runDir, "debate-messenger", "state.json");
	const debateOpened = await fileExists(messengerPath);

	let debateComplete = true;
	let debateGate = null;
	let approvalRequired = false;

	if (phase0Ready && !approvalRecorded) {
		const readiness = await validatePlanApprovalReadiness(projectRoot, runId, {
			risk_level: String(clarDoc?.risk_level ?? "med"),
			quick: opts?.quick,
		});
		const eligibility = await loadPlanDebateEligibilitySnapshot(runDir);
		debateGate = await validatePlanDebateGate(
			projectRoot,
			runId,
			eligibility ?? undefined,
		);
		debateComplete = debateGate.ok;
		approvalRequired = readiness.ok && debateComplete && hasPacket;
	}

	const debateRequired =
		phase0Ready &&
		!debateComplete &&
		!approvalRecorded &&
		(debateOpened || hasPacket);

	let debateRecoveryHint: string | null = null;
	let nextRequiredAction: string | null = null;
	if (!phase0Ready) {
		nextRequiredAction = phase0NeedsAskUser
			? "ask_user (Phase 0 task contract)"
			: "complete artifacts/task-clarification.yaml (Phase 0)";
	} else if (debateRequired && debateGate) {
		debateRecoveryHint = await buildPlanDebateGateRecovery(
			projectRoot,
			runId,
			debateGate,
		);
		nextRequiredAction =
			"Complete Review Gate (debate rounds + harness_debate_consensus) before approve_plan";
	} else if (approvalRequired && !approvalRecorded) {
		nextRequiredAction = "approve_plan then create_plan (Phase 6)";
	}

	return {
		phase0Ready,
		phase0NeedsAskUser,
		debateComplete,
		debateRequired,
		approvalRequired,
		approvalRecorded,
		nextRequiredAction,
		debateRecoveryHint,
	};
}

export function formatPlanHumanGateBlock(status: PlanHumanGateStatus): string {
	if (!status.nextRequiredAction) return "";
	const lines = [
		"[HarnessPlanGate]",
		`next_required_action=${status.nextRequiredAction}`,
		`phase0_ready=${status.phase0Ready}`,
		`review_gate_complete=${status.debateComplete}`,
		`review_gate_required=${status.debateRequired}`,
		`plan_approval_required=${status.approvalRequired}`,
		`plan_approval_recorded=${status.approvalRecorded}`,
	];
	if (status.debateRequired) {
		lines.push(
			"Do not end this turn with prose only — call harness_debate_round_status / harness_debate_focus_coverage and spawn the next debate lane subagent (one per batch).",
		);
	} else {
		lines.push(
			"Do not spawn planning subagents or end this turn until the required human step completes.",
		);
	}
	if (status.debateRecoveryHint) {
		lines.push("", status.debateRecoveryHint);
	}
	return lines.join("\n");
}

export async function shouldBlockSubagentForMissingPlanApproval(
	projectRoot: string,
	runId: string,
	entries: unknown[],
	phase: string,
): Promise<{ block: boolean; reason?: string }> {
	if (phase !== "plan" || isNonInteractivePlan()) return { block: false };
	if (hasPlanUserApproval(entries, { sincePlanCommand: true })) {
		return { block: false };
	}
	const status = await resolvePlanHumanGateStatus(projectRoot, runId, entries);
	if (!status.approvalRequired) return { block: false };
	return {
		block: true,
		reason:
			"Plan Review Gate is complete but user approval is missing. Call approve_plan (then create_plan) before further subagent work.",
	};
}

export async function validateTaskClarificationReadyWithHumanGate(
	runDir: string,
	entries: unknown[],
	opts?: { quick?: boolean; taskSummary?: string; lastOutcome?: string | null },
): Promise<TaskClarificationReadiness & { humanErrors: string[] }> {
	const doc = await readTaskClarificationDoc(runDir);
	const base = validateTaskClarificationDoc(doc, { requireReady: true });
	const human = validateTaskClarificationHumanGate(entries, doc, {
		quick: opts?.quick,
		taskSummary: opts?.taskSummary,
		allowFollowUpMessage: opts?.lastOutcome === "needs_clarification",
	});
	return {
		ok: base.ok && human.ok,
		errors: [...base.errors, ...human.errors],
		humanErrors: human.errors,
	};
}
