import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import {
	type HarnessUiState,
	HarnessUiStateStore,
} from "../lib/harness-ui-state";

type Severity = "accent" | "warning" | "error";

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

function charDisplayWidth(char: string): number {
	const codePoint = char.codePointAt(0);
	if (codePoint == null) return 0;
	if (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) return 0;
	if (codePoint >= 0x300 && codePoint <= 0x36f) return 0;
	if (
		codePoint >= 0x1100 &&
		(codePoint <= 0x115f ||
			codePoint === 0x2329 ||
			codePoint === 0x232a ||
			(codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
			(codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
			(codePoint >= 0xf900 && codePoint <= 0xfaff) ||
			(codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
			(codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
			(codePoint >= 0xff00 && codePoint <= 0xff60) ||
			(codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
			(codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
			(codePoint >= 0x20000 && codePoint <= 0x3fffd))
	) {
		return 2;
	}
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

type InFlightState = {
	toolCount: number;
	lastToolName: string | null;
};

class HarnessWidgetComponent {
	private widthCache?: number;
	private linesCache?: string[];
	private state: HarnessUiState;
	private inFlight: InFlightState;
	private themeRef: ThemeLike;

	constructor(
		state: HarnessUiState,
		inFlight: InFlightState,
		theme: ThemeLike,
	) {
		this.state = state;
		this.inFlight = inFlight;
		this.themeRef = theme;
	}

	public setData(state: HarnessUiState, inFlight: InFlightState): void {
		this.state = state;
		this.inFlight = inFlight;
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
		const showDebateRow =
			this.state.phase === "adversary" || this.state.phase === "merge";

		const substateColor: Severity =
			this.state.flowSubstate === "blocked"
				? "error"
				: this.state.flowSubstate === "severity-policy" ||
						this.state.flowSubstate === "human-required"
					? "warning"
					: "accent";
		const policyColor =
			this.state.policyDecision === "pass"
				? "success"
				: this.state.policyDecision === "conditional_pass"
					? "warning"
					: this.state.policyDecision === "block" ||
							this.state.policyDecision === "human_required"
						? "error"
						: "muted";

		const policyDisplay = this.state.policyDecision ?? "pending";

		const phaseToken = `${theme.fg("dim", "phase:")}${theme.fg("accent", this.state.phase)}`;
		const flowToken = `${theme.fg("dim", "flow:")}${theme.fg(substateColor, this.state.flowSubstate)}`;
		const policyToken = `${theme.fg("dim", "policy:")}${theme.fg(policyColor, policyDisplay)}`;
		const row1 = composeZones(
			`${theme.bold("Harness")} ${phaseToken} ${flowToken}`,
			policyToken,
			rowWidth,
		);

		const debateProgress =
			this.state.debateMaxRounds != null
				? `${this.state.debateRound}/${this.state.debateMaxRounds}`
				: String(this.state.debateRound);
		const budgetDisplay =
			this.state.debateBudgetUsed != null && this.state.debateBudgetCap != null
				? `${this.state.debateBudgetUsed}/${this.state.debateBudgetCap}`
				: this.state.debateBudgetUsed != null
					? String(this.state.debateBudgetUsed)
					: "n/a";
		const consensusTrend =
			this.state.consensusDelta == null
				? "flat"
				: this.state.consensusDelta > 0
					? "up"
					: this.state.consensusDelta < 0
						? "down"
						: "flat";
		const trendColor =
			consensusTrend === "up"
				? "success"
				: consensusTrend === "down"
					? "warning"
					: "muted";

		const sev = this.state.severity;
		const severityCompact =
			sev.correctness == null &&
			sev.security == null &&
			sev.architecture == null &&
			sev.testIntegrity == null
				? theme.fg("muted", "sev:n/a")
				: `${theme.fg("dim", "sev")} ${theme.fg("accent", `c:${sev.correctness ?? "-"}`)} ${theme.fg("accent", `s:${sev.security ?? "-"}`)} ${theme.fg("accent", `a:${sev.architecture ?? "-"}`)} ${theme.fg("accent", `t:${sev.testIntegrity ?? "-"}`)}`;

		const planFlag = this.state.planApproved
			? `${theme.fg("dim", "📋 Plan:")}${theme.fg("success", "OK")}`
			: `${theme.fg("dim", "📋 Plan:")}${theme.fg("error", "NO")}`;
		const reviewFlag = this.state.reviewIsolationOk
			? `${theme.fg("dim", "🧪 Review:")}${theme.fg("success", "OK")}`
			: `${theme.fg("dim", "🧪 Review:")}${theme.fg("warning", "ISO")}`;
		const budgetFlag = this.state.budgetExhausted
			? `${theme.fg("dim", "💰 Budget:")}${theme.fg("error", "HIT")}`
			: `${theme.fg("dim", "💰 Budget:")}${theme.fg("success", "OK")}`;
		const testsFlag =
			this.state.testIntegritySeverity === "high"
				? `${theme.fg("dim", "🛡 Tests:")}${theme.fg("error", "HIGH")}`
				: this.state.testIntegritySeverity === "medium"
					? `${theme.fg("dim", "🛡 Tests:")}${theme.fg("warning", "MED")}`
					: `${theme.fg("dim", "🛡 Tests:")}${theme.fg("success", "OK")}`;

		const toolDisplay = this.inFlight.lastToolName
			? `${this.inFlight.toolCount}:${this.inFlight.lastToolName}`
			: String(this.inFlight.toolCount);
		const nextDisplay =
			this.state.nextRecommendedCommand != null
				? this.state.nextRecommendedCommand.length > 36
					? `${this.state.nextRecommendedCommand.slice(0, 33)}...`
					: this.state.nextRecommendedCommand
				: null;
		const row3Left = `${planFlag} ${reviewFlag} ${budgetFlag} ${testsFlag}`;
		const row3Right = nextDisplay
			? `${theme.fg("dim", "inFlight:")}${theme.fg("accent", toolDisplay)} ${theme.fg("dim", "next:")}${theme.fg("accent", nextDisplay)}`
			: `${theme.fg("dim", "inFlight:")}${theme.fg("accent", toolDisplay)}`;
		const row3 = composeZones(row3Left, row3Right, rowWidth);

		const lines: string[] = [truncateToWidth(row1, rowWidth)];
		if (showDebateRow) {
			const debateLeft = `${theme.fg("dim", "Debate")} ${theme.fg("accent", `rounds:${debateProgress}`)} ${theme.fg("dim", "trend:")}${theme.fg(trendColor, consensusTrend)} ${theme.fg("dim", "budget:")}${theme.fg("accent", budgetDisplay)}`;
			const row2 = composeZones(debateLeft, severityCompact, rowWidth);
			lines.push(truncateToWidth(row2, rowWidth));
		}
		lines.push(truncateToWidth(row3, rowWidth));
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
	const decision = state.policyDecision ?? "pending";
	return `h:${state.phase}/${state.flowSubstate}/${decision}`;
}

export default function harnessLiveWidget(pi: ExtensionAPI) {
	const stateStore = new HarnessUiStateStore();
	const inFlightCalls = new Set<string>();
	let lastToolName: string | null = null;
	let widgetMounted = false;
	let tuiHandle: TuiLike | null = null;
	let component: HarnessWidgetComponent | null = null;
	let refreshQueued = false;
	let lastRenderHash = "";
	let mountCtx: ExtensionContext | null = null;

	function mountHarnessWidget(ctx: ExtensionContext): void {
		if (!ctx.hasUI) return;
		const state = stateStore.refresh(ctx);
		const inFlight: InFlightState = { toolCount: 0, lastToolName: null };
		lastRenderHash = computeRenderHash(state, inFlight);

		ctx.ui.setWidget(
			"harness-live",
			(tui, theme) => {
				widgetMounted = true;
				tuiHandle = tui;
				component = new HarnessWidgetComponent(
					stateStore.snapshot(),
					inFlight,
					theme,
				);
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

	function remountHarnessLiveWidget(ctx: ExtensionContext): void {
		if (!ctx.hasUI || !widgetMounted) return;
		ctx.ui.setWidget("harness-live", undefined);
		mountHarnessWidget(ctx);
	}

	pi.events.on("subagents:agents-widget-mounted", () => {
		if (mountCtx) remountHarnessLiveWidget(mountCtx);
	});

	pi.events.on("plan-approval:mounted", () => {
		if (mountCtx) remountHarnessLiveWidget(mountCtx);
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

	function computeRenderHash(
		state: HarnessUiState,
		inFlight: InFlightState,
	): string {
		return JSON.stringify({
			phase: state.phase,
			flowSubstate: state.flowSubstate,
			planApproved: state.planApproved,
			reviewIsolationOk: state.reviewIsolationOk,
			budgetExhausted: state.budgetExhausted,
			testIntegritySeverity: state.testIntegritySeverity,
			debateRound: state.debateRound,
			debateMaxRounds: state.debateMaxRounds,
			debateBudgetUsed: state.debateBudgetUsed,
			debateBudgetCap: state.debateBudgetCap,
			policyDecision: state.policyDecision,
			consensusDelta: state.consensusDelta,
			severity: state.severity,
			nextRecommendedCommand: state.nextRecommendedCommand,
			inFlight,
		});
	}

	function scheduleRefresh(ctx: ExtensionContext): void {
		if (refreshQueued) return;
		refreshQueued = true;
		queueMicrotask(() => {
			refreshQueued = false;
			const state = stateStore.refresh(ctx);
			const inFlight: InFlightState = {
				toolCount: inFlightCalls.size,
				lastToolName,
			};
			const hash = computeRenderHash(state, inFlight);
			updateStatusFallback(ctx, state);
			if (hash === lastRenderHash) return;
			lastRenderHash = hash;
			if (component) component.setData(state, inFlight);
			tuiHandle?.requestRender();
		});
	}

	pi.on("session_start", (_event, ctx) => {
		mountCtx = ctx;
		mountHarnessWidget(ctx);
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

	pi.on("tool_execution_start", (event, ctx) => {
		inFlightCalls.add(event.toolCallId);
		lastToolName = event.toolName;
		scheduleRefresh(ctx);
	});

	pi.on("tool_result", (event, ctx) => {
		inFlightCalls.delete(event.toolCallId);
		if (inFlightCalls.size === 0) lastToolName = null;
		scheduleRefresh(ctx);
	});
}
