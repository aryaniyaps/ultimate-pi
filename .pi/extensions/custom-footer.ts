/**
 * Colorful Footer Extension — replaces the default footer with a color-coded
 * context-usage progress bar.
 *
 * Requirements:
 *   - Visual progress bar showing context window usage percentage.
 *   - GREEN  (theme.fg "success") when usage < 50%
 *   - YELLOW (theme.fg "warning") when usage 50–80%
 *   - RED    (theme.fg "error")   when usage > 80%
 *   - Percentage shown alongside bar, e.g. "Context: [████████░░] 72%"
 *   - Registered via ctx.ui.setFooter(factory) and updated live on "context" events.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Box, Text, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import type { TUI } from "@mariozechner/pi-tui";

// ── bar builder ───────────────────────────────────────────────────

const LABEL = "Context";
const BAR_FILLED = "█";
const BAR_EMPTY = "░";

type BarColor = "success" | "warning" | "error";

function barColor(percent: number): BarColor {
	if (percent < 50) return "success";
	if (percent < 80) return "warning";
	return "error";
}

function buildLine(
	width: number,
	percent: number,
	colorFn: (s: string) => string,
): string {
	const pctStr = `${Math.round(percent)}%`;
	const prefix = `${LABEL}: [`;
	const suffix = `] ${pctStr}`;
	const overhead = visibleWidth(prefix) + visibleWidth(suffix);
	const barWidth = Math.max(1, width - overhead);

	const filled = Math.round((Math.min(percent, 100) / 100) * barWidth);
	const empty = barWidth - filled;
	const bar = BAR_FILLED.repeat(filled) + BAR_EMPTY.repeat(empty);

	return truncateToWidth(prefix + colorFn(bar) + suffix, width);
}

// ── extension ─────────────────────────────────────────────────────

export default function colorfulFooter(pi: ExtensionAPI) {
	const state: {
		tui: TUI | null;
		box: Box | null;
		text: Text | null;
		percent: number | null;
	} = { tui: null, box: null, text: null, percent: null };

	// Register the custom footer whenever a session starts (covers
	// startup, reload, session switch, and resume).
	pi.on("session_start", (_event, ctx) => {
		ctx.ui.setFooter((t, theme, _footerData) => {
			state.tui = t;

			const box = new Box(1, 0);
			const text = new Text();
			box.addChild(text);

			state.box = box;
			state.text = text;

			return {
				dispose() {
					state.tui = null;
					state.box = null;
					state.text = null;
				},

				invalidate() {
					box.invalidate();
					text.invalidate();
				},

				render(width: number): string[] {
					const pct = state.percent;
					if (pct === null) {
						text.setText(theme.fg("dim", `${LABEL}: calculating…`));
					} else {
						const line = buildLine(width, pct, (s) =>
							theme.fg(barColor(pct), s),
						);
						text.setText(line);
					}
					return box.render(width);
				},
			};
		});
	});

	// Update the shared state and trigger a redraw whenever context
	// usage changes (fires before every LLM call).
	pi.on("context", (_event, ctx) => {
		const usage = ctx.getContextUsage();
		state.percent = usage?.percent ?? null;

		state.box?.invalidate();
		state.text?.invalidate();
		state.tui?.requestRender();
	});
}
