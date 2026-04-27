/**
 * AutoCommitPaneComponent — full-height right-side TUI overlay for git autocommit status.
 *
 * Renders as a continuous sidebar from top to bottom of the terminal,
 * with a vertical border on the left edge separating it from the main
 * conversation area — similar to the opencode TUI layout.
 *
 * Uses `tui.showOverlay()` anchored to "top-right" with `maxHeight: "100%"`.
 */
import type { Component, TUI } from "@mariozechner/pi-tui";
import type { Theme } from "@mariozechner/pi-coding-agent";

// ── status colours (ANSI) ──────────────────────────────────────────────────
const A = {
	reset: "\u001b[0m",
	bold: "\u001b[1m",
	dim: "\u001b[2m",
	red: "\u001b[31m",
	green: "\u001b[32m",
	yellow: "\u001b[33m",
	blue: "\u001b[34m",
	cyan: "\u001b[36m",
	gray: "\u001b[90m",
	white: "\u001b[37m",
};

// ── state shape (orchestrator writes, pane reads) ──────────────────────────
export type PaneState = {
	status: string;            // e.g. "idle", "committed(main)", "blocked(error)"
	blockedReason?: string;    // human-readable blocked detail
	configError?: string;      // config error message
	sessionCommits: number;    // commits this session
	lastBranch?: string;        // last branch committed to
	enabled: boolean;          // config.enabled
	dryRun: boolean;           // config.dryRun
	aiEnabled: boolean;        // config.ai.enabled
	commitInFlight: boolean;   // currently evaluating / committing
};

export const DEFAULT_PANE_STATE: PaneState = {
	status: "idle",
	sessionCommits: 0,
	enabled: false,
	dryRun: true,
	aiEnabled: true,
	commitInFlight: false,
};

// ── pane width (columns, including left border) ─────────────────────────────
export const PANE_WIDTH = 30;

// ── Component ───────────────────────────────────────────────────────────────
export class AutoCommitPaneComponent implements Component {
	private state: PaneState = { ...DEFAULT_PANE_STATE };
	private cachedLines: string[] | null = null;
	private version = 0;
	private renderedVersion = -1;
	private cachedHeight = 0;

	constructor(private readonly tui: TUI) {}

	updateState(patch: Partial<PaneState>): void {
		Object.assign(this.state, patch);
		this.version += 1;
		this.tui.requestRender();
	}

	invalidate(): void {
		this.cachedLines = null;
		this.version += 1;
		this.tui.requestRender();
	}

	render(width: number): string[] {
		if (this.cachedLines && this.renderedVersion === this.version && this.cachedHeight === this.tui.terminal.rows) {
			return this.cachedLines;
		}
		const termHeight = this.tui.terminal.rows;
		this.cachedLines = this.buildLines(width, termHeight);
		this.renderedVersion = this.version;
		this.cachedHeight = termHeight;
		return this.cachedLines;
	}

	// ── build full-height sidebar ─────────────────────────────────────────
	private buildLines(width: number, termHeight: number): string[] {
		const w = Math.min(width, PANE_WIDTH);
		const inner = w - 2; // content area (minus left border '│' + right padding)
		const height = Math.max(termHeight, 1);
		const lines: string[] = [];

		// ── header ────────────────────────────────────────────────────────
		lines.push(padLine(`${A.bold}${A.cyan}autocommit${A.reset}`, inner));
		lines.push(borderRow(inner, "─"));

		// ── status block ──────────────────────────────────────────────────
		const statusText = formatStatus(this.state.status);
		lines.push(padLine(statusText, inner));

		if (this.state.commitInFlight) {
			lines.push(padLine(`${A.yellow}⟳ committing…${A.reset}`, inner));
		}

		// ── details block ────────────────────────────────────────────────
		if (this.state.blockedReason) {
			lines.push(padLine("", inner)); // spacer
			lines.push(padLine(`${A.red}blocked${A.reset}`, inner));
			const detail = truncate(this.state.blockedReason, inner);
			lines.push(padLine(`${A.dim}${detail}${A.reset}`, inner));
		}
		if (this.state.configError) {
			lines.push(padLine("", inner));
			lines.push(padLine(`${A.red}config error${A.reset}`, inner));
			const detail = truncate(this.state.configError, inner);
			lines.push(padLine(`${A.dim}${detail}${A.reset}`, inner));
		}

		// ── last branch / push info ──────────────────────────────────────
		if (this.state.lastBranch) {
			lines.push(padLine("", inner));
			lines.push(padLine(`${A.green}↻ ${truncate(this.state.lastBranch, inner - 2)}${A.reset}`, inner));
		}

		// ── config footer pinned to bottom ────────────────────────────────
		const flags: string[] = [];
		if (this.state.dryRun) flags.push("dry");
		if (!this.state.enabled) flags.push("off");
		if (this.state.aiEnabled) flags.push("ai");
		const flagStr = flags.length > 0 ? flags.join(",") : "basic";
		const countStr = `∑${this.state.sessionCommits}`;

		const configLine = `${A.dim}${flagStr}${A.reset}  ${A.bold}${countStr}${A.reset}`;
		const footer = [
			borderRow(inner, "─"),
			padLine(configLine, inner),
		]; // 2 rows

		// ── fill remaining rows between content and footer ────────────────
		const contentRows = lines.length + footer.length;
		const fillerRows = Math.max(0, height - contentRows);
		for (let i = 0; i < fillerRows; i++) {
			lines.push(padLine("", inner));
		}
		lines.push(...footer);

		// ── prepend left vertical border to every line ───────────────────
		return lines.map((line) => `│${line}`);
	}
}

// ── overlay factory ─────────────────────────────────────────────────────────
/** Minimum terminal width (cols) to show the overlay. Below this it hides. */
const MIN_TERM_WIDTH = 60;

export function createAutoCommitPane(tui: TUI, _theme: Theme): { component: AutoCommitPaneComponent; dispose: () => void } & Component {
	const component = new AutoCommitPaneComponent(tui);
	const overlay = tui.showOverlay(component, {
		anchor: "top-right",
		width: PANE_WIDTH,
		maxHeight: "100%",
		offsetX: 0,
		offsetY: 0,
		nonCapturing: true,
		visible: (termWidth, _termHeight) => termWidth >= MIN_TERM_WIDTH,
	});

	const wrapper: Component & { dispose(): void } = {
		render(width: number): string[] {
			return component.render(width);
		},
		invalidate(): void {
			component.invalidate();
		},
		dispose(): void {
			overlay.hide();
		},
	};
	return { component, ...wrapper };
}

// ── formatting helpers ──────────────────────────────────────────────────────
function formatStatus(status: string): string {
	if (status.startsWith("committed(") || status.startsWith("pushed(")) return `${A.green}✔ ${status}${A.reset}`;
	if (status.startsWith("blocked(")) return `${A.red}✗ ${status}${A.reset}`;
	if (status.startsWith("warning(")) return `${A.yellow}⚠ ${status}${A.reset}`;
	if (status.startsWith("checking(")) return `${A.cyan}⟳ ${status}${A.reset}`;
	if (status.startsWith("dry-run(")) return `${A.yellow}◎ ${status}${A.reset}`;
	if (status.startsWith("disabled(")) return `${A.gray}◼ ${status}${A.reset}`;
	if (status === "idle") return `${A.gray}● idle${A.reset}`;
	return `${A.white}? ${status}${A.reset}`;
}

/** Pad a content line to exactly `innerWidth` visible columns, right-trimming ANSI-aware. */
function padLine(text: string, innerWidth: number): string {
	const visible = strippedLen(text);
	const pad = Math.max(0, innerWidth - visible);
	return `${text}${" ".repeat(pad)}`;
}

/** A separator row: repeated `char` filling `innerWidth`. */
function borderRow(innerWidth: number, char: string): string {
	return char.repeat(innerWidth);
}

function truncate(text: string, max: number): string {
	if (strippedLen(text) <= max) return text;
	// truncate based on visible length
	const stripped = text.replace(/\u001b\[[0-9;]*m/g, "");
	if (stripped.length <= max) return text;
	// simple approach: truncate raw text, then append reset
	return text.slice(0, max - 1) + "…" + A.reset;
}

/** Approximate visible length by stripping ANSI escapes. */
function strippedLen(text: string): number {
	return text.replace(/\u001b\[[0-9;]*m/g, "").length;
}