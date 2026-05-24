import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
	canonicalPlanPath,
	canonicalPlanReviewPath,
	type HarnessRunContext,
	type PlanPacketLike,
} from "../harness-run-context.js";
import { formatPlanPacketYaml } from "./format-plan.js";
import type { PlanResearchBrief } from "./types.js";

export {
	canonicalPlanReviewPath,
	PLAN_REVIEW_BASENAME,
} from "../harness-run-context.js";

export type PlanReviewStatus = "draft" | "approved" | "committed";

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function str(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function strList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((item) => (typeof item === "string" ? item.trim() : null))
		.filter((item): item is string => Boolean(item));
}

function pushListSection(
	lines: string[],
	title: string,
	items: string[],
): void {
	if (!items.length) return;
	lines.push(`**${title}:**`);
	for (const item of items) lines.push(`- ${item}`);
	lines.push("");
}

function appendDecompositionMarkdown(
	lines: string[],
	decomp: Record<string, unknown>,
): void {
	lines.push("## Phase 1 — Problem decomposition", "");
	const restate = str(decomp.problem_restatement);
	if (restate) lines.push("**What is being asked?**", "", restate, "");
	const types = strList(decomp.problem_types);
	if (types.length) lines.push(`**Problem type(s):** ${types.join(", ")}`, "");
	const scope = asRecord(decomp.scope);
	if (scope) {
		const focus = str(scope.narrowed_focus);
		if (focus) lines.push("**Scope:**", "", focus, "");
		pushListSection(lines, "Excluded", strList(scope.excluded));
	}
	for (const [label, key] of [
		["Hard constraints", "hard_constraints"],
		["Soft constraints", "soft_constraints"],
		["Success metrics", "success_metrics"],
	] as const) {
		pushListSection(lines, label, strList(decomp[key]));
	}
	const prior = asRecord(decomp.prior_art);
	if (prior) {
		lines.push("**Prior art:**", "");
		const best = str(prior.best_approach);
		const gap = str(prior.gap);
		if (best) lines.push(`- Best approach: ${best}`);
		if (gap) lines.push(`- Gap: ${gap}`);
		for (const dead of strList(prior.dead_ends))
			lines.push(`- Dead end: ${dead}`);
		lines.push("");
	}
	const core = str(decomp.core_tension);
	if (core) lines.push("**Core tension:**", "", core, "");
}

function appendHypothesisMarkdown(
	lines: string[],
	hyp: Record<string, unknown>,
): void {
	lines.push("## Phase 2 — DARWIN hypothesis", "");
	const primary = asRecord(hyp.primary);
	if (primary) {
		for (const [label, key] of [
			["Claim", "claim"],
			["Mechanism", "mechanism"],
			["Prediction", "prediction"],
			["Experiment", "experiment"],
			["Resolves tension", "tension_resolution"],
		] as const) {
			const text = str(primary[key]);
			if (text) lines.push(`**${label}:** ${text}`, "");
		}
	}
	const fork = asRecord(hyp.dialectical_fork);
	if (fork) {
		const forkText = str(fork.fork);
		if (forkText) lines.push(`**Dialectical fork:** ${forkText}`, "");
		const pathA = str(fork.path_a);
		const pathB = str(fork.path_b);
		if (pathA) lines.push(`- **Path A:** ${pathA}`);
		if (pathB) lines.push(`- **Path B:** ${pathB}`);
		lines.push("");
	}
	const alts = Array.isArray(hyp.alternatives) ? hyp.alternatives : [];
	if (alts.length) {
		lines.push("**Alternatives:**");
		for (const alt of alts) {
			const rec = asRecord(alt);
			const claim = rec ? str(rec.claim) : null;
			const bet = rec ? str(rec.key_bet) : null;
			if (claim) lines.push(`- ${claim}${bet ? ` (bet: ${bet})` : ""}`);
		}
		lines.push("");
	}
	const steps = strList(hyp.recommended_next_steps);
	if (steps.length) {
		lines.push("**Recommended next steps:**");
		for (const step of steps) lines.push(`1. ${step}`);
		lines.push("");
	}
}

function appendImplementationMarkdown(
	lines: string[],
	impl: Record<string, unknown>,
): void {
	lines.push("## Phase 3.5 — Implementation research", "");
	const framing = str(impl.problem_framing);
	if (framing) lines.push("**Problem framing:**", "", framing, "");
	const rec = asRecord(impl.recommended_approach);
	if (rec) {
		const summary = str(rec.summary);
		const conf = str(rec.recommended_approach_confidence);
		if (summary) {
			lines.push(
				`**Recommended approach**${conf ? ` (${conf} confidence)` : ""}:`,
			);
			lines.push("", summary, "");
		}
		const rationale = str(rec.confidence_rationale);
		if (rationale) lines.push(`*Rationale:* ${rationale}`, "");
	}
	const patterns = Array.isArray(impl.solution_patterns)
		? impl.solution_patterns
		: [];
	if (patterns.length) {
		lines.push("**Solution patterns:**");
		for (const p of patterns) {
			const pat = asRecord(p);
			const name = pat ? str(pat.name) : null;
			const fit = pat ? str(pat.fit) : null;
			if (name) lines.push(`- **${name}**${fit ? `: ${fit}` : ""}`);
		}
		lines.push("");
	}
	pushListSection(lines, "Open questions", strList(impl.open_questions));
	pushListSection(lines, "Anti-patterns", strList(impl.anti_patterns));
}

function appendEvaluationMarkdown(
	lines: string[],
	evalBrief: Record<string, unknown>,
): void {
	lines.push("## Self-evaluation", "");
	lines.push("| Dimension | Score | Rationale |");
	lines.push("|-----------|-------|-----------|");
	const dims = asRecord(evalBrief.dimensions);
	if (dims) {
		for (const name of [
			"novelty",
			"coherence",
			"testability",
			"impact",
		] as const) {
			const dim = asRecord(dims[name]);
			if (!dim) continue;
			const score = typeof dim.score === "number" ? String(dim.score) : "?";
			lines.push(`| ${name} | ${score}/100 | ${str(dim.rationale) ?? ""} |`);
		}
	}
	const rel = asRecord(evalBrief.relevance);
	if (rel) {
		const passes = rel.passes === true ? "✓" : "✗";
		lines.push(`| Relevance | ${passes} | ${str(rel.rationale) ?? ""} |`);
	}
	lines.push("");
	const summary = str(evalBrief.human_summary);
	if (summary) lines.push(summary, "");
}

/** Render Darwin research sections for plan-review.md. */
export function formatResearchBriefMarkdown(
	research: PlanResearchBrief | null | undefined,
): string {
	if (!research) return "";
	const lines: string[] = [];
	const sections = [
		[asRecord(research.decomposition), appendDecompositionMarkdown],
		[asRecord(research.hypothesis), appendHypothesisMarkdown],
		[asRecord(research.implementation), appendImplementationMarkdown],
		[asRecord(research.eval), appendEvaluationMarkdown],
	] as const;
	for (const [section, append] of sections) {
		if (section) append(lines, section);
	}
	return lines.length ? `${lines.join("\n")}\n` : "";
}

export function formatPlanPacketMarkdown(
	packet: PlanPacketLike,
	opts?: {
		human_summary?: string | null;
		status?: PlanReviewStatus;
		plan_packet_path?: string | null;
		research_brief?: PlanResearchBrief | null;
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
		lines.push(`- **canonical YAML:** \`${opts.plan_packet_path}\``);
	}
	lines.push("");
	if (opts?.human_summary?.trim()) {
		lines.push("## Summary");
		lines.push("");
		lines.push(opts.human_summary.trim());
		lines.push("");
	}
	const researchMd = formatResearchBriefMarkdown(opts?.research_brief);
	if (researchMd) {
		lines.push(researchMd.trimEnd());
		lines.push("");
	}
	lines.push("## Plan packet");
	lines.push("");
	lines.push("```yaml");
	for (const line of formatPlanPacketYaml(packet).split("\n")) {
		lines.push(line);
	}
	lines.push("```");
	lines.push("");
	if (status === "draft") {
		lines.push(
			"Review this plan, then choose **Approve**, **Request changes**, or **Cancel** in the prompt below (same flow as `ask_user`).",
		);
	} else if (status === "approved") {
		lines.push(
			"Approved in the harness TUI. Waiting for `create_plan` to write `plan-packet.yaml`, or run `/harness-plan-commit` if that step failed.",
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
		research_brief?: PlanResearchBrief | null;
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
		research_brief: opts?.research_brief,
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
		`Open this markdown file in your editor if you prefer; approval options appear in the harness prompt below.`
	);
}
