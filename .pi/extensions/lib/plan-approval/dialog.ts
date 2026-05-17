import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";
import { formatPlanPacketLines } from "./format-plan.js";
import type {
	PlanApprovalDialogResult,
	ValidatedApprovePlanParams,
} from "./types.js";

type FocusRegion = "plan" | "options";

interface CustomAnswer {
	response: { kind: "selection"; selections: string[] };
}

/** Lines reserved below overlay: harness-live widget + editor + footer. */
export const PLAN_APPROVAL_BOTTOM_RESERVE_LINES = 11;
/** Estimate agents widget height when stacking above harness live. */
export const PLAN_APPROVAL_AGENTS_TOP_RESERVE_LINES = 12;
export const PLAN_APPROVAL_MIN_VIEWPORT = 6;

export function computePlanViewport(
	availableHeight: number,
	chromeLines: number,
): number {
	return Math.max(PLAN_APPROVAL_MIN_VIEWPORT, availableHeight - chromeLines);
}

export function computePlanOverlayMaxHeight(termHeight: number): number {
	return Math.max(
		PLAN_APPROVAL_MIN_VIEWPORT + 8,
		termHeight -
			PLAN_APPROVAL_BOTTOM_RESERVE_LINES -
			PLAN_APPROVAL_AGENTS_TOP_RESERVE_LINES,
	);
}

function countPlanChromeLines(
	validated: ValidatedApprovePlanParams,
	displayOptions: ValidatedApprovePlanParams["options"],
	useOverlay: boolean,
): number {
	let chrome = useOverlay ? 2 : 0; // borders
	chrome += 1; // title
	if (validated.human_summary) {
		chrome += validated.human_summary.split("\n").length;
	}
	chrome += 1; // blank before plan
	chrome += 1; // plan label
	chrome += 1; // blank before options
	chrome += 1; // options label
	for (const opt of displayOptions) {
		chrome += 1;
		if (opt.description) chrome += 1;
	}
	chrome += 1; // blank before hints
	chrome += 1; // hints
	return chrome;
}

function withTimeout<T>(
	promise: Promise<T | null>,
	ms: number | undefined,
): Promise<T | null> {
	if (!ms) return promise;
	return Promise.race([
		promise,
		new Promise<null>((resolve) => {
			setTimeout(() => resolve(null), ms);
		}),
	]);
}

export type RunPlanApprovalDialogOptions = {
	onMounted?: () => void;
};

export async function runPlanApprovalDialog(
	ui: ExtensionUIContext,
	validated: ValidatedApprovePlanParams,
	options?: RunPlanApprovalDialogOptions,
): Promise<PlanApprovalDialogResult> {
	const planLines = formatPlanPacketLines(validated.plan_packet, 100);
	const displayOptions = validated.options;
	const useOverlay = validated.displayMode !== "inline";
	let overlayTermHeight = 24;

	const result = await withTimeout(
		ui.custom<CustomAnswer | null>(
			(tui, theme, _kb, done) => {
				const tuiHeight = (tui as unknown as { height?: number }).height;
				overlayTermHeight =
					typeof tuiHeight === "number" && tuiHeight > 10 ? tuiHeight : 24;
				options?.onMounted?.();

				let scrollOffset = 0;
				let optionIndex = 0;
				let focus: FocusRegion = "plan";
				let cachedLines: string[] | undefined;

				function refresh() {
					cachedLines = undefined;
					tui.requestRender();
				}

				function submitSelection() {
					const opt = displayOptions[optionIndex];
					done({
						response: { kind: "selection", selections: [opt.title] },
					});
				}

				function handleInput(data: string) {
					if (focus === "plan") {
						if (matchesKey(data, Key.up) || data === "k") {
							scrollOffset = Math.max(0, scrollOffset - 1);
							refresh();
							return;
						}
						if (matchesKey(data, Key.down) || data === "j") {
							scrollOffset += 1;
							refresh();
							return;
						}
						if (matchesKey(data, Key.pageUp)) {
							scrollOffset = Math.max(0, scrollOffset - 8);
							refresh();
							return;
						}
						if (matchesKey(data, Key.pageDown)) {
							scrollOffset += 8;
							refresh();
							return;
						}
						if (matchesKey(data, Key.tab)) {
							focus = "options";
							refresh();
							return;
						}
					}

					if (focus === "options") {
						if (matchesKey(data, Key.up)) {
							optionIndex = Math.max(0, optionIndex - 1);
							refresh();
							return;
						}
						if (matchesKey(data, Key.down)) {
							optionIndex = Math.min(
								displayOptions.length - 1,
								optionIndex + 1,
							);
							refresh();
							return;
						}
						if (matchesKey(data, Key.tab)) {
							focus = "plan";
							refresh();
							return;
						}
						if (matchesKey(data, Key.enter)) {
							submitSelection();
							return;
						}
					}

					if (matchesKey(data, Key.escape)) {
						done(null);
					}
				}

				function render(width: number): string[] {
					if (cachedLines) return cachedLines;

					const lines: string[] = [];
					const add = (s: string) => lines.push(truncateToWidth(s, width));
					const dims = (tui as { height?: number }).height;
					const termHeight = typeof dims === "number" && dims > 10 ? dims : 24;
					const chromeLines = countPlanChromeLines(
						validated,
						displayOptions,
						useOverlay,
					);

					let availableHeight: number;
					if (useOverlay) {
						const overlayMax = computePlanOverlayMaxHeight(termHeight);
						availableHeight = overlayMax;
					} else {
						availableHeight = termHeight - PLAN_APPROVAL_BOTTOM_RESERVE_LINES;
					}
					const planViewport = computePlanViewport(
						availableHeight,
						chromeLines,
					);

					if (useOverlay) {
						add(theme.fg("accent", "─".repeat(width)));
					}

					add(theme.fg("accent", " Plan approval"));
					if (validated.human_summary) {
						for (const line of validated.human_summary.split("\n")) {
							add(theme.fg("muted", ` ${line}`));
						}
					}
					lines.push("");

					const maxScroll = Math.max(0, planLines.length - planViewport);
					scrollOffset = Math.min(scrollOffset, maxScroll);
					const visible = planLines.slice(
						scrollOffset,
						scrollOffset + planViewport,
					);
					const planLabel =
						focus === "plan"
							? theme.fg("accent", " [plan — ↑↓/Pg scroll, Tab → options]")
							: theme.fg("dim", " [plan]");
					add(planLabel);
					for (const line of visible) {
						add(theme.fg("text", ` ${line}`));
					}
					if (planLines.length > planViewport) {
						add(
							theme.fg(
								"dim",
								` … ${scrollOffset + 1}-${scrollOffset + visible.length} of ${planLines.length}`,
							),
						);
					}
					lines.push("");

					const optLabel =
						focus === "options"
							? theme.fg("accent", " Options (↑↓, Enter, Tab → plan):")
							: theme.fg("dim", " Options (Tab to focus):");
					add(optLabel);
					for (let i = 0; i < displayOptions.length; i++) {
						const opt = displayOptions[i];
						const focused = focus === "options" && i === optionIndex;
						const prefix = focused ? theme.fg("accent", "> ") : "  ";
						const num = `${i + 1}. `;
						if (focused) {
							add(prefix + theme.fg("accent", `${num}${opt.title}`));
						} else {
							add(`${prefix}${theme.fg("text", `${num}${opt.title}`)}`);
						}
						if (opt.description) {
							add(`     ${theme.fg("muted", opt.description)}`);
						}
					}

					lines.push("");
					add(theme.fg("dim", " Tab: plan ↔ options • Esc: cancel"));

					if (useOverlay) {
						add(theme.fg("accent", "─".repeat(width)));
					}

					cachedLines = lines;
					return lines;
				}

				return {
					render,
					invalidate: () => {
						cachedLines = undefined;
					},
					handleInput,
				};
			},
			useOverlay
				? {
						overlay: true,
						overlayOptions: () => ({
							anchor: "bottom-center",
							width: "100%",
							margin: { bottom: PLAN_APPROVAL_BOTTOM_RESERVE_LINES },
							maxHeight: computePlanOverlayMaxHeight(overlayTermHeight),
						}),
					}
				: undefined,
		),
		undefined,
	);

	if (!result) {
		return { response: null, cancelled: true };
	}

	return { response: result.response, cancelled: false };
}
