/**
 * Custom Footer Extension — single-line footer with context bar, session cost,
 * model name, provider, thinking level, working directory, and git branch.
 *
 * ~/project (main)  ↑12k ↓8k  $0.042  [████████░░] 72%  anthropic • claude-sonnet-4-20250514 • xhigh
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { TUI } from "@mariozechner/pi-tui";
import { Box, Text, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

// ── token formatting ──────────────────────────────────────────────

function fmtTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1_000_000) return `${Math.round(count / 1000)}k`;
	if (count < 10_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
	return `${Math.round(count / 1_000_000)}M`;
}

// ── bar builder ───────────────────────────────────────────────────

const BAR_FILLED = "█";
const BAR_EMPTY = "░";
const BAR_COUNT = 10;

type BarColor = "success" | "warning" | "error";

function barColor(percent: number): BarColor {
	if (percent < 50) return "success";
	if (percent < 80) return "warning";
	return "error";
}

/** Build colored bar segment — returns filled and empty strings separately. */
function buildBar(percent: number): { filled: string; empty: string } {
	const filled = Math.round((Math.min(percent, 100) / 100) * BAR_COUNT);
	const empty = BAR_COUNT - filled;
	return {
		filled: BAR_FILLED.repeat(filled),
		empty: BAR_EMPTY.repeat(empty),
	};
}

// ── cost computation ──────────────────────────────────────────────

interface CostSnapshot {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	cost: number;
}

function computeCost(ctx: ExtensionContext): CostSnapshot {
	let input = 0;
	let output = 0;
	let cacheRead = 0;
	let cacheWrite = 0;
	let cost = 0;

	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type === "message" && entry.message.role === "assistant") {
			const u = entry.message.usage;
			input += u.input ?? 0;
			output += u.output ?? 0;
			cacheRead += u.cacheRead ?? 0;
			cacheWrite += u.cacheWrite ?? 0;
			cost += u.cost?.total ?? 0;
		}
	}

	return { input, output, cacheRead, cacheWrite, cost };
}

// ── model info ────────────────────────────────────────────────────

interface ModelInfo {
	id: string;
	provider: string;
	reasoning: boolean;
}

function modelInfo(ctx: ExtensionContext): ModelInfo {
	const m = ctx.model;
	if (!m) return { id: "no-model", provider: "unknown", reasoning: false };
	return { id: m.id, provider: m.provider, reasoning: m.reasoning };
}

// ── thinking label ────────────────────────────────────────────────

/** Returns thinking level display string, or null if model doesn't support reasoning. */
function thinkingLabel(level: string | null, reasoning: boolean): string | null {
	if (!reasoning || level == null) return null;
	if (level === "minimal") return "off";
	return level;
}

// ── cwd + branch ──────────────────────────────────────────────────

function pathLabel(cwd: string, branch: string | null): { cwd: string; branch: string | null } {
	let pwd = cwd;
	const home = process.env.HOME || process.env.USERPROFILE;
	if (home && pwd.startsWith(home)) {
		pwd = `~${pwd.slice(home.length)}`;
	}
	return { cwd: pwd, branch };
}

// ── extension ─────────────────────────────────────────────────────

export default function customFooter(pi: ExtensionAPI) {
	let unsubBranch: (() => void) | null = null;

	const state: {
		tui: TUI | null;
		box: Box | null;
		textLine: Text | null;
		percent: number | null;
		cost: CostSnapshot;
		cwd: string;
		modelId: string;
		modelProvider: string;
		modelReasoning: boolean;
		thinkingLevel: string | null;
		branch: string | null;
	} = {
		tui: null,
		box: null,
		textLine: null,
		percent: null,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 },
		cwd: process.cwd(),
		modelId: "…",
		modelProvider: "…",
		modelReasoning: false,
		thinkingLevel: null,
		branch: null,
	};

	function invalidate() {
		state.box?.invalidate();
		state.textLine?.invalidate();
		state.tui?.requestRender();
	}

	function refreshModelAndThinking(ctx: ExtensionContext) {
		const mi = modelInfo(ctx);
		state.modelId = mi.id;
		state.modelProvider = mi.provider;
		state.modelReasoning = mi.reasoning;
		state.thinkingLevel = pi.getThinkingLevel();
	}

	pi.on("session_start", (_event, ctx) => {
		state.cwd = ctx.cwd;
		refreshModelAndThinking(ctx);
		state.cost = computeCost(ctx);

		ctx.ui.setFooter((tui, theme, footerData) => {
			if (unsubBranch) { unsubBranch(); unsubBranch = null; }

			state.tui = tui;
			state.branch = footerData.getGitBranch();

			unsubBranch = footerData.onBranchChange(() => {
				state.branch = footerData.getGitBranch();
				invalidate();
			});

			const box = new Box(1, 0);
			const textLine = new Text("", 0, 0);
			box.addChild(textLine);

			state.box = box;
			state.textLine = textLine;

			return {
				dispose() {
					if (unsubBranch) { unsubBranch(); unsubBranch = null; }
					state.tui = null;
					state.box = null;
					state.textLine = null;
				},

				invalidate() {
					box.invalidate();
					textLine.invalidate();
				},

				render(width: number): string[] {
					const dim = (s: string) => theme.fg("dim", s);
					const c = state.cost;
					const pct = state.percent;

					// Available text width: Box paddingX=1 on each side → subtract 2,
					// then subtract safety margin so we never overflow on edge-case terminals
					const SAFETY_MARGIN = 2;
					const innerW = Math.max(1, width - 2 - SAFETY_MARGIN);

					// ── left: cwd/branch  tokens  cost ──
					const { cwd: cwdPath, branch: gitBranch } = pathLabel(state.cwd, state.branch);
					const pathDisplay = gitBranch
						? `${cwdPath} (${theme.fg("error", gitBranch)})`
						: cwdPath;
					const leftParts: string[] = [pathDisplay];
					if (c.input > 0 || c.output > 0) {
						leftParts.push(`↑${fmtTokens(c.input)} ↓${fmtTokens(c.output)}`);
					}
					if (c.cost > 0) {
						leftParts.push(`$${c.cost.toFixed(4)}`);
					}
					const leftStr = leftParts.join("  ");

					// ── bar: [████████░░] 72% ──
					const safePct = pct ?? 0;
					const { filled, empty } = buildBar(safePct);
					const barColorName = barColor(safePct);
					const barInner = theme.fg(barColorName, filled) + empty;
					const barFull = `[${barInner}] ${Math.round(safePct)}%`;

					// ── right: provider • modelId thinkingLevel ──
					const tl = thinkingLabel(state.thinkingLevel, state.modelReasoning);
					const modelDisplay = tl ? `${state.modelId} ${tl}` : state.modelId;
					const rightParts: string[] = [state.modelProvider, modelDisplay];
					const rightStr = rightParts.join(" • ");

					// ── compose single line ──
					const colLeft = leftStr;
					const dimRight = dim(rightStr);
					const lw = visibleWidth(colLeft);
					const rw = visibleWidth(dimRight);
					const bw = visibleWidth(barFull);
					const gap = 2;

					if (lw + gap + bw + gap + rw <= innerW) {
						const pad = innerW - lw - gap - bw - gap - rw;
						const line = colLeft + " ".repeat(gap + pad) + barFull + " ".repeat(gap) + dimRight;
						textLine.setText(truncateToWidth(line, innerW));
					} else {
						// Priority: keep bar visible, keep left (cwd) intact, truncate modelId first
						const tlNow = thinkingLabel(state.thinkingLevel, state.modelReasoning);
						const buildRight = (mid: string) => {
							const modelPart = tlNow ? `${mid} ${tlNow}` : mid;
							const parts: string[] = [state.modelProvider];
							if (modelPart) parts.push(modelPart);
							return dim(parts.join(" • "));
						};

						let truncMid = state.modelId;
						let dimR = buildRight(truncMid);
						let rwNow = visibleWidth(dimR);

						while (truncMid.length > 0 && lw + gap + bw + gap + rwNow > innerW) {
							truncMid = truncMid.slice(0, -1);
							dimR = buildRight(truncMid);
							rwNow = visibleWidth(dimR);
						}

						if (lw + gap + bw + gap + rwNow <= innerW) {
							const pad = innerW - lw - gap - bw - gap - rwNow;
							const line = colLeft + " ".repeat(gap + pad) + barFull + " ".repeat(gap) + dimR;
							textLine.setText(truncateToWidth(line, innerW));
						} else {
							// ModelId gone, still overflows: truncate leftStr
							const avail = innerW - bw - rwNow - gap - gap;
							if (avail < 1) {
								textLine.setText(truncateToWidth(dimR, innerW));
							} else {
								const truncLeft = truncateToWidth(colLeft, Math.max(1, avail));
								const line = truncLeft + " ".repeat(gap) + barFull + " ".repeat(gap) + dimR;
								textLine.setText(truncateToWidth(line, innerW));
							}
						}
					}

					return box.render(width);
				},
			};
		});
	});

	// Update context usage + cost before each LLM call
	pi.on("context", (_event, ctx) => {
		const usage = ctx.getContextUsage();
		state.percent = usage?.percent ?? null;
		state.cost = computeCost(ctx);
		refreshModelAndThinking(ctx);
		invalidate();
	});

	// Track model changes
	pi.on("model_select", (event) => {
		state.modelId = event.model?.id ?? "…";
		state.modelProvider = event.model?.provider ?? "…";
		state.modelReasoning = event.model?.reasoning ?? false;
		state.thinkingLevel = pi.getThinkingLevel();
		invalidate();
	});

	// Catch thinking level changes between turns (e.g. /thinking command)
	pi.on("turn_start", (_event, ctx) => {
		state.thinkingLevel = pi.getThinkingLevel();
		refreshModelAndThinking(ctx);
		invalidate();
	});
}
