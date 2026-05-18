import type { AgentToolResult } from "@earendil-works/pi-agent-core";
import type {
	Theme,
	ToolRenderResultOptions,
} from "@earendil-works/pi-coding-agent";
import { Text, truncateToWidth } from "@earendil-works/pi-tui";
import type { PlanPacketLike } from "../../../lib/harness-run-context.js";
import { formatPlanPacketLines } from "./format-plan.js";
import type { ApprovePlanToolDetails } from "./types.js";

export function renderApprovePlanCall(
	args: { plan_packet?: PlanPacketLike; human_summary?: string },
	theme: Theme,
): Text {
	const packet = args.plan_packet;
	const planId = packet?.plan_id ?? "?";
	const risk = packet?.risk_level ?? "?";
	const scope = typeof packet?.scope === "string" ? packet.scope : "";
	const scopeShort = scope.length > 60 ? `${scope.slice(0, 57)}...` : scope;
	const summary = args.human_summary?.trim();
	const head = summary
		? `${planId} ${risk} — ${summary}`
		: `${planId} ${risk} — ${scopeShort || "(no scope)"}`;
	return new Text(theme.fg("accent", `approve_plan: ${head}`), 0, 0);
}

export function renderApprovePlanResult(
	result: AgentToolResult<unknown>,
	_options: ToolRenderResultOptions,
	theme: Theme,
): Text {
	const details = result.details as ApprovePlanToolDetails | undefined;
	if (!details) {
		const block = result.content[0];
		return new Text(block?.type === "text" ? block.text : "", 0, 0);
	}
	if (details.cancelled) {
		return new Text(theme.fg("warning", "Plan approval cancelled"), 0, 0);
	}
	const sel =
		details.response?.kind === "selection"
			? details.response.selections[0]
			: details.response?.kind === "freeform"
				? details.response.text
				: "";
	if (/^approve/i.test(sel ?? "")) {
		return new Text(
			theme.fg(
				"success",
				`Approved plan ${details.plan_packet.plan_id ?? ""}`.trim(),
			),
			0,
			0,
		);
	}
	if (sel) return new Text(theme.fg("muted", sel), 0, 0);
	return new Text(theme.fg("muted", "No response"), 0, 0);
}

export function renderHarnessPlanDraft(
	details: {
		plan_packet?: PlanPacketLike;
		human_summary?: string | null;
		plan_markdown?: string | null;
	},
	width: number,
	theme: Theme,
	content?: string | null,
): string[] {
	const markdown = content?.trim() || details.plan_markdown?.trim();
	if (markdown) {
		return markdown.split("\n").map((line) => truncateToWidth(line, width));
	}
	const lines: string[] = [];
	lines.push(theme.fg("accent", "Harness plan (pending approval)"));
	if (details.human_summary) {
		lines.push(theme.fg("muted", details.human_summary));
		lines.push("");
	}
	const packet = details.plan_packet;
	if (!packet) {
		lines.push(theme.fg("warning", "(no plan_packet)"));
		return lines;
	}
	for (const line of formatPlanPacketLines(packet, width)) {
		lines.push(truncateToWidth(line, width));
	}
	return lines;
}
