/**
 * AutoCommitPaneComponent — right-side TUI overlay for git autocommit status.
 *
 * Uses `tui.showOverlay()` anchored to "top-right" so the pane appears to the
 * right of the conversation rather than below the prompt.
 *
 * Rendered lines are bordered with a box-drawing style that adapts to the
 * current Theme palette (accent for border, text for body, etc.).
 */
import type { Component, TUI } from "@mariozechner/pi-tui";
import type { Theme } from "@mariozechner/pi-coding-agent";

// ── status colours (ANSI, no dependency on ink / theme at render time) ──────
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

// ── exported shared state (orchestrator writes, pane reads) ────────────────
export type PaneState = {
	status: string;           // raw status token, e.g. "idle", "committed(main)", "blocked(error)"
	blockedReason?: string;    // human-readable blocked detail
	configError?: string;      // config error message
	sessionCommits: number;   // how many commits this session
	lastBranch?: string;      // last branch committed to
	enabled: boolean;          // config.enabled
	dryRun: boolean;           // config.dryRun
	aiEnabled: boolean;        // config.ai.enabled
	commitInFlight: boolean;  // currently evaluating / committing
};

export const DEFAULT_PANE_STATE: PaneState = {
	status: "idle",
	sessionCommits: 0,
	enabled: false,
	dryRun: true,
	aiEnabled: true,
	commitInFlight: false,
};

// ── width of the pane (columns) ────────────────────────────────────────────
export const PANE_WIDTH = 32;

// ── Component ──────────────────────────────────────────────────────────────
export class AutoCommitPaneComponent implements Component {
	private state: PaneState = { ...DEFAULT_PANE_STATE };
	private cachedLines: string[] | null = null;
	private version = 0;
	private renderedVersion = -1;

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
		if (this.cachedLines && this.renderedVersion === this.version) {
			return this.cachedLines;
		}
		this.cachedLines = this.buildLines(width);
		this.renderedVersion = this.version;
		return this.cachedLines;
	}

	// ── helpers ─────────────────────────────────────────────────────────────
	private buildLines(width: number): string[] {
		const w = Math.min(width, PANE_WIDTH);
		const inner = w - 2; // minus left+right border
		const lines: string[] = [];

		// header
		lines.push(borderLine(w, "┌", "┐", "─"));
		lines.push(`${A.bold}${A.cyan}│ autocommit${A.reset}${" ".repeat(Math.max(0, inner - 11))}│`);
		lines.push(borderLine(w, "├", "┤", "─"));

		// status
		const statusLine = formatStatus(this.state.status, inner);
		lines.push(`│ ${statusLine}${" ".repeat(Math.max(0, inner - strippedLen(statusLine) - 2))}│`);

		// commit-in-flight spinner
		if (this.state.commitInFlight) {
			const inflight = `${A.yellow}⟳ committing…${A.reset}`;
			lines.push(`│ ${inflight}${" ".repeat(Math.max(0, inner - strippedLen(inflight) - 2))}│`);
		}

		// details
		if (this.state.blockedReason) {
			const detail = `${A.red}✗ ${truncate(this.state.blockedReason, inner - 4)}${A.reset}`;
			lines.push(`│ ${detail}${" ".repeat(Math.max(0, inner - strippedLen(detail) - 2))}│`);
		}
		if (this.state.configError) {
			const detail = `${A.red}! ${truncate(this.state.configError, inner - 4)}${A.reset}`;
			lines.push(`│ ${detail}${" ".repeat(Math.max(0, inner - strippedLen(detail) - 2))}│`);
		}
		if (this.state.lastBranch) {
			const detail = `${A.green}↻ ${truncate(this.state.lastBranch, inner - 4)}${A.reset}`;
			lines.push(`│ ${detail}${" ".repeat(Math.max(0, inner - strippedLen(detail) - 2))}│`);
		}

		lines.push(borderLine(w, "├", "┤", "─"));

		// config summary
		const flags: string[] = [];
		if (this.state.dryRun) flags.push("dry-run");
		if (!this.state.enabled) flags.push("off");
		if (this.state.aiEnabled) flags.push("ai");
		const flagStr = flags.length > 0 ? flags.join(",") : "basic";
		const countStr = `∑${this.state.sessionCommits}`;
		const configLine = `${A.dim}${flagStr}${A.reset}  ${A.bold}${countStr}${A.reset}`;
		lines.push(`│ ${configLine}${" ".repeat(Math.max(0, inner - strippedLen(configLine) - 2))}│`);

		lines.push(borderLine(w, "└", "┘", "─"));
		return lines;
	}
}

// ── overlay factory (call from extension ctx.ui.setWidget) ─────────────────
/** Minimum terminal width (cols) to show the overlay. Below this it hides. */
const MIN_TERM_WIDTH = 60;

export function createAutoCommitPane(tui: TUI, _theme: Theme): { component: AutoCommitPaneComponent; dispose: () => void } & Component {
	const component = new AutoCommitPaneComponent(tui);
	const overlay = tui.showOverlay(component, {
		anchor: "top-right",
		width: PANE_WIDTH,
		offsetX: 1,
		offsetY: 1,
		visible: (termWidth, _termHeight) => termWidth >= MIN_TERM_WIDTH,
	});

	const wrapper: Component & { dispose(): void } = {
		render(width: number): string[] {
			// delegate to the real component; overlay handles positioning
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

// ── formatting helpers ─────────────────────────────────────────────────────
function formatStatus(status: string, _innerWidth: number): string {
	if (status.startsWith("committed(") || status.startsWith("pushed(")) return `${A.green}✔ ${status}${A.reset}`;
	if (status.startsWith("blocked(")) return `${A.red}✗ ${status}${A.reset}`;
	if (status.startsWith("warning(")) return `${A.yellow}⚠ ${status}${A.reset}`;
	if (status.startsWith("checking(")) return `${A.cyan}⟳ ${status}${A.reset}`;
	if (status.startsWith("dry-run(")) return `${A.yellow}◎ ${status}${A.reset}`;
	if (status.startsWith("disabled(")) return `${A.gray}◼ ${status}${A.reset}`;
	if (status === "idle") return `${A.gray}● ${status}${A.reset}`;
	return `${A.white}? ${status}${A.reset}`;
}

function borderLine(width: number, left: string, right: string, fill: string): string {
	return `${left}${fill.repeat(width - 2)}${right}`;
}

function truncate(text: string, max: number): string {
	if (text.length <= max) return text;
	return text.slice(0, max - 1) + "…";
}

/** Approximate visible length by stripping ANSI escapes. */
function strippedLen(text: string): number {
	return text.replace(/\u001b\[[0-9;]*m/g, "").length;
}