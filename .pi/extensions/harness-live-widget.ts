import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { isHarnessProjectEnabled } from "../lib/harness-project-config.js";
import { evaluateCrossSessionResume } from "../lib/harness-run-context.js";
import {
	deriveHarnessStatusHint,
	formatHarnessPhaseLabel,
	type HarnessStatusSeverity,
	type HarnessUiState,
	HarnessUiStateStore,
	nextHarnessPhase,
} from "../lib/harness-ui-state";

type TuiLike = { requestRender(): void };
type ThemeLike = {
	fg(
		color:
			| "text"
			| "accent"
			| "muted"
			| "dim"
			| "success"
			| "warning"
			| "error"
			| "toolTitle",
		text: string,
	): string;
	bold(text: string): string;
};

// Keep a small hard buffer to avoid rare width mismatches across terminals/fonts.
const TERMINAL_WIDTH_SAFETY_MARGIN = 2;

function truncateToWidth(input: string, width: number): string {
	return fitToWidth(input, width);
}

const ESC_CODE = 27;

function consumeAnsiSequence(input: string, start: number): number {
	if (
		input.charCodeAt(start) !== ESC_CODE ||
		input.charCodeAt(start + 1) !== 91
	) {
		return start;
	}
	let cursor = start + 2;
	while (cursor < input.length) {
		const code = input.charCodeAt(cursor);
		if (code >= 64 && code <= 126) {
			return cursor + 1;
		}
		cursor += 1;
	}
	return start;
}

function stripAnsi(input: string): string {
	let output = "";
	let cursor = 0;
	while (cursor < input.length) {
		const nextCursor = consumeAnsiSequence(input, cursor);
		if (nextCursor !== cursor) {
			cursor = nextCursor;
			continue;
		}
		const codePoint = input.codePointAt(cursor);
		if (codePoint == null) break;
		const char = String.fromCodePoint(codePoint);
		output += char;
		cursor += char.length;
	}
	return output;
}

function visibleWidth(input: string): number {
	let width = 0;
	const plain = stripAnsi(input);
	for (const char of Array.from(plain)) {
		width += charDisplayWidth(char);
	}
	return width;
}

const WIDE_SINGLE_CODE_POINTS = new Set([0x2329, 0x232a]);
const WIDE_RANGES: ReadonlyArray<readonly [number, number]> = [
	[0x1100, 0x115f],
	[0x2e80, 0xa4cf],
	[0xac00, 0xd7a3],
	[0xf900, 0xfaff],
	[0xfe10, 0xfe19],
	[0xfe30, 0xfe6f],
	[0xff00, 0xff60],
	[0xffe0, 0xffe6],
	[0x1f300, 0x1faff],
	[0x20000, 0x3fffd],
];

function inRange(codePoint: number, start: number, end: number): boolean {
	return codePoint >= start && codePoint <= end;
}

function isWideCodePoint(codePoint: number): boolean {
	if (WIDE_SINGLE_CODE_POINTS.has(codePoint)) return true;
	if (inRange(codePoint, 0x2e80, 0xa4cf) && codePoint === 0x303f) return false;
	return WIDE_RANGES.some(([start, end]) => inRange(codePoint, start, end));
}

function charDisplayWidth(char: string): number {
	const codePoint = char.codePointAt(0);
	if (codePoint == null) return 0;
	if (inRange(codePoint, 0x00, 0x1f) || inRange(codePoint, 0x7f, 0x9f))
		return 0;
	if (inRange(codePoint, 0x300, 0x36f)) return 0;
	if (isWideCodePoint(codePoint)) return 2;
	return 1;
}

function takeFirstVisibleChars(
	input: string,
	targetVisibleChars: number,
): string {
	if (targetVisibleChars <= 0) return "";
	let remaining = targetVisibleChars;
	let output = "";
	let cursor = 0;

	while (cursor < input.length && remaining > 0) {
		const ansiCursor = consumeAnsiSequence(input, cursor);
		if (ansiCursor !== cursor) {
			output += input.slice(cursor, ansiCursor);
			cursor = ansiCursor;
			continue;
		}
		const rest = input.slice(cursor);
		const codePoint = rest.codePointAt(0);
		if (codePoint == null) break;
		const char = String.fromCodePoint(codePoint);
		const charWidth = charDisplayWidth(char);
		if (charWidth > remaining) break;
		output += char;
		cursor += char.length;
		remaining -= charWidth;
	}

	return output;
}

function fitToWidth(input: string, width: number): string {
	if (width <= 0) return "";
	const currentWidth = visibleWidth(input);
	if (currentWidth <= width) {
		return `${input}${" ".repeat(width - currentWidth)}`;
	}
	if (width === 1) return "\u2026";
	return `${takeFirstVisibleChars(input, width - 1)}\u2026`;
}

function composeZones(left: string, right: string, width: number): string {
	if (width <= 0) return "";
	const minGap = 2;
	const leftW = visibleWidth(left);
	const rightW = visibleWidth(right);

	if (leftW + minGap + rightW <= width) {
		const gap = width - leftW - rightW;
		return `${left}${" ".repeat(gap)}${right}`;
	}

	const maxRight = Math.max(10, Math.floor(width * 0.4));
	const rightFit = fitToWidth(right, Math.min(maxRight, width));
	const rightFitW = visibleWidth(rightFit);
	const leftBudget = Math.max(1, width - minGap - rightFitW);
	const leftFit = fitToWidth(left, leftBudget);
	return fitToWidth(`${leftFit}${" ".repeat(minGap)}${rightFit}`, width);
}

function themeSeverityColor(
	severity: HarnessStatusSeverity,
): "accent" | "warning" | "error" | "success" | "muted" {
	return severity;
}

class HarnessWidgetComponent {
	private widthCache?: number;
	private linesCache?: string[];
	private state: HarnessUiState;
	private themeRef: ThemeLike;

	constructor(state: HarnessUiState, theme: ThemeLike) {
		this.state = state;
		this.themeRef = theme;
	}

	public setData(state: HarnessUiState): void {
		this.state = state;
		this.invalidate();
	}

	public setTheme(theme: ThemeLike): void {
		this.themeRef = theme;
		this.invalidate();
	}

	public render(width: number): string[] {
		if (this.linesCache && this.widthCache === width) return this.linesCache;
		const theme = this.themeRef;
		const rowWidth = Math.max(1, width - TERMINAL_WIDTH_SAFETY_MARGIN);

		const currentLabel = formatHarnessPhaseLabel(this.state.phase);
		const nextPhase = nextHarnessPhase(this.state.phase);
		const nowToken = `${theme.fg("dim", "now:")}${theme.fg("accent", currentLabel)}`;
		const phaseToken =
			nextPhase != null
				? `${nowToken} ${theme.fg("dim", "→")} ${theme.fg("accent", formatHarnessPhaseLabel(nextPhase))}`
				: nowToken;

		const status = deriveHarnessStatusHint(this.state);
		const statusColor = themeSeverityColor(status.severity);
		const statusToken = theme.fg(statusColor, status.text);

		const left = `${theme.bold("Harness")} ${phaseToken}`;
		const row = composeZones(left, statusToken, rowWidth);

		const lines = [truncateToWidth(row, rowWidth)];
		this.widthCache = width;
		this.linesCache = lines;
		return lines;
	}

	public invalidate(): void {
		this.widthCache = undefined;
		this.linesCache = undefined;
	}
}

function statusToken(state: HarnessUiState): string {
	const current = formatHarnessPhaseLabel(state.phase);
	const next = nextHarnessPhase(state.phase);
	const phasePart =
		next != null ? `${current}→${formatHarnessPhaseLabel(next)}` : current;
	const hint = deriveHarnessStatusHint(state).text;
	return `h:${phasePart}|${hint}`;
}

export default function harnessLiveWidget(pi: ExtensionAPI) {
	const stateStore = new HarnessUiStateStore();
	let widgetMounted = false;
	let tuiHandle: TuiLike | null = null;
	let component: HarnessWidgetComponent | null = null;
	let refreshQueued = false;
	let lastRenderHash = "";
	let mountCtx: ExtensionContext | null = null;

	function mountHarnessWidget(ctx: ExtensionContext): void {
		if (!ctx.hasUI || !isHarnessProjectEnabled()) return;
		const state = stateStore.refresh(ctx);
		lastRenderHash = computeRenderHash(state);

		ctx.ui.setWidget(
			"harness-live",
			(tui, theme) => {
				widgetMounted = true;
				tuiHandle = tui;
				component = new HarnessWidgetComponent(stateStore.snapshot(), theme);
				return {
					render(width: number): string[] {
						component?.setTheme(theme);
						return component?.render(width) ?? [];
					},
					invalidate(): void {
						component?.invalidate();
					},
				};
			},
			{ placement: "aboveEditor" },
		);
		updateStatusFallback(ctx, state);
	}

	function clearHarnessWidget(ctx: ExtensionContext): void {
		if (!ctx.hasUI) return;
		const tui = tuiHandle;
		ctx.ui.setWidget("harness-live", undefined);
		ctx.ui.setStatus("harness-mode", undefined);
		widgetMounted = false;
		tuiHandle = null;
		component = null;
		lastRenderHash = "";
		tui?.requestRender();
	}

	function remountHarnessLiveWidget(ctx: ExtensionContext): void {
		if (!ctx.hasUI || !widgetMounted) return;
		clearHarnessWidget(ctx);
		mountHarnessWidget(ctx);
	}

	pi.events.on("subagents:agents-widget-mounted", () => {
		if (mountCtx) remountHarnessLiveWidget(mountCtx);
	});

	pi.events.on("plan-approval:mounted", () => {
		if (mountCtx) remountHarnessLiveWidget(mountCtx);
	});

	pi.events.on("harness-run-context:updated", () => {
		stateStore.setCrossSessionResumeCommand(null);
		if (mountCtx) scheduleRefresh(mountCtx);
	});

	pi.events.on("harness-progress:updated", () => {
		if (mountCtx) scheduleRefresh(mountCtx);
	});

	pi.events.on("harness-waiting-for-user", () => {
		if (mountCtx) scheduleRefresh(mountCtx);
	});

	pi.events.on("harness-cross-session-resume", (payload: unknown) => {
		const data =
			payload && typeof payload === "object"
				? (payload as { resume_command?: string })
				: null;
		const cmd =
			typeof data?.resume_command === "string" ? data.resume_command : null;
		stateStore.setCrossSessionResumeCommand(cmd);
		if (mountCtx) scheduleRefresh(mountCtx);
	});

	pi.events.on("harness-project-enabled:changed", (payload: unknown) => {
		const data =
			payload && typeof payload === "object"
				? (payload as { enabled?: boolean })
				: null;
		if (!mountCtx || typeof data?.enabled !== "boolean") return;
		if (data.enabled) {
			mountHarnessWidget(mountCtx);
			tuiHandle?.requestRender();
			return;
		}
		clearHarnessWidget(mountCtx);
	});

	function updateStatusFallback(
		ctx: ExtensionContext,
		state: HarnessUiState,
	): void {
		if (!ctx.hasUI) return;
		if (!widgetMounted) {
			ctx.ui.setStatus("harness-mode", statusToken(state));
			return;
		}
		ctx.ui.setStatus("harness-mode", undefined);
	}

	function computeRenderHash(state: HarnessUiState): string {
		return JSON.stringify({
			phase: state.phase,
			planApproved: state.planApproved,
			budgetExhausted: state.budgetExhausted,
			testIntegritySeverity: state.testIntegritySeverity,
			policyDecision: state.policyDecision,
			flowSubstate: state.flowSubstate,
			nextRecommendedCommand: state.nextRecommendedCommand,
			crossSessionResumeCommand: state.crossSessionResumeCommand,
		});
	}

	function scheduleRefresh(ctx: ExtensionContext): void {
		if (refreshQueued) return;
		refreshQueued = true;
		queueMicrotask(() => {
			refreshQueued = false;
			if (!isHarnessProjectEnabled()) {
				clearHarnessWidget(ctx);
				return;
			}
			const state = stateStore.refresh(ctx);
			const hash = computeRenderHash(state);
			updateStatusFallback(ctx, state);
			if (hash === lastRenderHash) return;
			lastRenderHash = hash;
			if (component) component.setData(state);
			tuiHandle?.requestRender();
		});
	}

	pi.on("session_start", async (_event, ctx) => {
		mountCtx = ctx;
		mountHarnessWidget(ctx);
		const info = await evaluateCrossSessionResume(
			process.cwd(),
			ctx.sessionManager.getEntries(),
		);
		if (info) {
			stateStore.setCrossSessionResumeCommand(info.resumeCommand);
			scheduleRefresh(ctx);
		}
	});

	pi.on("context", (_event, ctx) => {
		scheduleRefresh(ctx);
	});

	pi.on("turn_start", (_event, ctx) => {
		scheduleRefresh(ctx);
	});

	pi.on("model_select", (_event, ctx) => {
		scheduleRefresh(ctx);
	});

	pi.on("agent_end", (_event, ctx) => {
		scheduleRefresh(ctx);
	});
}
