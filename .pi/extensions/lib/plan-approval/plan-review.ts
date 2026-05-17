import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
	canonicalPlanPath,
	canonicalPlanReviewPath,
	type HarnessRunContext,
	type PlanPacketLike,
} from "../../../lib/harness-run-context.js";
import { formatPlanPacketLines } from "./format-plan.js";

export {
	canonicalPlanReviewPath,
	PLAN_REVIEW_BASENAME,
} from "../../../lib/harness-run-context.js";

export type PlanReviewStatus = "draft" | "approved" | "committed";

export function formatPlanPacketMarkdown(
	packet: PlanPacketLike,
	opts?: {
		human_summary?: string | null;
		status?: PlanReviewStatus;
		plan_packet_path?: string | null;
	},
): string {
	const lines: string[] = [];
	const status = opts?.status ?? "draft";
	lines.push("# Harness plan");
	lines.push("");
	lines.push(`- **Status:** ${status}`);
	lines.push(`- **plan_id:** ${packet.plan_id ?? "?"}`);
	lines.push(`- **task_id:** ${packet.task_id ?? "?"}`);
	lines.push(
		`- **risk_level:** ${typeof packet.risk_level === "string" ? packet.risk_level : "med"}`,
	);
	if (opts?.plan_packet_path) {
		lines.push(`- **canonical JSON:** \`${opts.plan_packet_path}\``);
	}
	lines.push("");
	if (opts?.human_summary?.trim()) {
		lines.push("## Summary");
		lines.push("");
		lines.push(opts.human_summary.trim());
		lines.push("");
	}
	lines.push("## Plan packet");
	lines.push("");
	lines.push("```text");
	for (const line of formatPlanPacketLines(packet, 100)) {
		lines.push(line);
	}
	lines.push("```");
	lines.push("");
	if (status === "draft") {
		lines.push(
			"Review this file in your editor, then return to the harness TUI to **Approve**, **Request changes**, or **Cancel**.",
		);
	} else if (status === "approved") {
		lines.push(
			"Approved in the harness TUI. Waiting for `create_plan` to write `plan-packet.json`, or run `/harness-plan-commit` if that step failed.",
		);
	} else {
		lines.push(
			"Plan committed. Next: `/harness-run` to execute (do not pass `--plan` on the happy path).",
		);
	}
	lines.push("");
	return `${lines.join("\n")}\n`;
}

export async function writePlanReviewMarkdown(
	projectRoot: string,
	runCtx: HarnessRunContext | null,
	packet: PlanPacketLike,
	opts?: {
		human_summary?: string | null;
		status?: PlanReviewStatus;
	},
): Promise<string | null> {
	const runId = runCtx?.run_id;
	if (!runId) return null;
	const reviewPath = canonicalPlanReviewPath(runId, projectRoot);
	const planPacketPath =
		runCtx.plan_packet_path ?? canonicalPlanPath(runId, projectRoot);
	const body = formatPlanPacketMarkdown(packet, {
		human_summary: opts?.human_summary,
		status: opts?.status ?? "draft",
		plan_packet_path: planPacketPath,
	});
	try {
		await mkdir(dirname(reviewPath), { recursive: true });
		await writeFile(reviewPath, body, "utf-8");
		return reviewPath;
	} catch {
		return null;
	}
}

interface SessionEntryLike {
	type?: string;
	customType?: string;
	data?: unknown;
	message?: {
		role?: string;
		toolName?: string;
		details?: unknown;
		content?: { type?: string; text?: string }[];
	};
}

/** Latest plan_packet from drafts, approve_plan tool results, or assistant JSON blocks. */
export function extractLatestPlanPacketFromEntries(
	entries: unknown[],
): { packet: PlanPacketLike; human_summary?: string | null } | null {
	let found: { packet: PlanPacketLike; human_summary?: string | null } | null =
		null;

	const consider = (
		packet: PlanPacketLike | undefined,
		human_summary?: string | null,
	) => {
		if (!packet || typeof packet !== "object") return;
		if (!packet.plan_id && !packet.scope) return;
		found = { packet, human_summary: human_summary ?? null };
	};

	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i] as SessionEntryLike;
		if (entry.type === "custom" && entry.customType === "harness-plan-draft") {
			const data = entry.data as {
				plan_packet?: PlanPacketLike;
				human_summary?: string | null;
			};
			consider(data.plan_packet, data.human_summary);
			if (found) return found;
		}
		if (entry.type === "message" && entry.message?.role === "toolResult") {
			const toolName = entry.message.toolName;
			const details = entry.message.details as
				| {
						plan_packet?: PlanPacketLike;
						human_summary?: string;
				  }
				| undefined;
			if (toolName === "approve_plan" && details?.plan_packet) {
				consider(details.plan_packet, details.human_summary);
				if (found) return found;
			}
		}
	}

	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i] as SessionEntryLike;
		if (entry.type !== "message" || entry.message?.role !== "assistant") {
			continue;
		}
		const blocks = entry.message.content ?? [];
		for (const block of blocks) {
			if (block.type !== "text" || !block.text) continue;
			const match = block.text.match(/```json\s*([\s\S]*?)```/i);
			if (!match) continue;
			try {
				const parsed = JSON.parse(match[1]) as {
					plan_packet?: PlanPacketLike;
					human_summary?: string;
				};
				if (parsed.plan_packet) {
					consider(parsed.plan_packet, parsed.human_summary);
					if (found) return found;
				}
			} catch {
				/* ignore malformed assistant JSON */
			}
		}
	}

	return found;
}

export async function syncPlannerPlanReviewToDisk(
	projectRoot: string,
	runCtx: HarnessRunContext | null,
	entries: unknown[],
	_opts?: { agentStatus?: string },
): Promise<string | null> {
	const draft = extractLatestPlanPacketFromEntries(entries);
	if (!draft) return null;
	return writePlanReviewMarkdown(projectRoot, runCtx, draft.packet, {
		human_summary: draft.human_summary,
		status: "draft",
	});
}

export function formatPlanReviewUserHint(reviewPath: string | null): string {
	if (!reviewPath) {
		return "No plan draft was captured yet. If the planner is still clarifying, answer in the subagent or re-run /harness-plan.";
	}
	const abs = resolve(reviewPath);
	return (
		`Full plan for editor review: ${abs}\n` +
		`Open this markdown file in VS Code (or your editor), read the scope and acceptance checks, then return to the harness TUI to Approve / Request changes / Cancel.`
	);
}
