import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import {
	Editor,
	type EditorTheme,
	Key,
	matchesKey,
	truncateToWidth,
} from "@earendil-works/pi-tui";
import type { AskResponse, DialogResult, ValidatedAskParams } from "./types.js";

type DisplayOption = {
	title: string;
	description?: string;
	isFreeform?: boolean;
};

interface CustomAnswer {
	response: AskResponse;
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

export async function runAskDialog(
	ui: ExtensionUIContext,
	validated: ValidatedAskParams,
): Promise<DialogResult> {
	const { question, context, options, allowMultiple, allowFreeform } =
		validated;

	const displayOptions: DisplayOption[] = [...options];
	if (allowFreeform) {
		displayOptions.push({
			title: "Type something…",
			isFreeform: true,
		});
	}

	// Freeform-only: no listed options
	if (displayOptions.length === 0) {
		const text = await ui.input(question, "");
		if (!text?.trim()) {
			return { response: null, cancelled: true };
		}
		return {
			response: { kind: "freeform", text: text.trim() },
			cancelled: false,
		};
	}

	const result = await withTimeout(
		ui.custom<CustomAnswer | null>((tui, theme, _kb, done) => {
			let optionIndex = 0;
			let editMode = false;
			const selected = new Set<number>();
			let cachedLines: string[] | undefined;

			const editorTheme: EditorTheme = {
				borderColor: (s) => theme.fg("accent", s),
				selectList: {
					selectedPrefix: (t) => theme.fg("accent", t),
					selectedText: (t) => theme.fg("accent", t),
					description: (t) => theme.fg("muted", t),
					scrollInfo: (t) => theme.fg("dim", t),
					noMatch: (t) => theme.fg("warning", t),
				},
			};
			const editor = new Editor(tui, editorTheme);

			editor.onSubmit = (value) => {
				const trimmed = value.trim();
				if (trimmed) {
					done({ response: { kind: "freeform", text: trimmed } });
				} else {
					editMode = false;
					editor.setText("");
					refresh();
				}
			};

			function refresh() {
				cachedLines = undefined;
				tui.requestRender();
			}

			function submitSelection() {
				if (allowMultiple) {
					const titles = [...selected]
						.sort((a, b) => a - b)
						.map((i) => displayOptions[i].title)
						.filter((t) => t !== "Type something…");
					if (titles.length === 0) return;
					done({ response: { kind: "selection", selections: titles } });
					return;
				}
				const opt = displayOptions[optionIndex];
				if (opt.isFreeform) {
					editMode = true;
					refresh();
					return;
				}
				done({
					response: { kind: "selection", selections: [opt.title] },
				});
			}

			function handleInput(data: string) {
				if (editMode) {
					if (matchesKey(data, Key.escape)) {
						editMode = false;
						editor.setText("");
						refresh();
						return;
					}
					editor.handleInput(data);
					refresh();
					return;
				}

				if (matchesKey(data, Key.up)) {
					optionIndex = Math.max(0, optionIndex - 1);
					refresh();
					return;
				}
				if (matchesKey(data, Key.down)) {
					optionIndex = Math.min(displayOptions.length - 1, optionIndex + 1);
					refresh();
					return;
				}

				if (allowMultiple && matchesKey(data, Key.space)) {
					const opt = displayOptions[optionIndex];
					if (!opt.isFreeform) {
						if (selected.has(optionIndex)) {
							selected.delete(optionIndex);
						} else {
							selected.add(optionIndex);
						}
						refresh();
					}
					return;
				}

				if (matchesKey(data, Key.enter)) {
					submitSelection();
					return;
				}

				if (matchesKey(data, Key.escape)) {
					done(null);
				}
			}

			function render(width: number): string[] {
				if (cachedLines) return cachedLines;

				const lines: string[] = [];
				const add = (s: string) => lines.push(truncateToWidth(s, width));
				const useOverlay = validated.displayMode !== "inline";

				if (useOverlay) {
					add(theme.fg("accent", "─".repeat(width)));
				}

				if (context) {
					for (const line of context.split("\n")) {
						add(theme.fg("muted", ` ${line}`));
					}
					lines.push("");
				}

				add(theme.fg("text", ` ${question}`));
				lines.push("");

				for (let i = 0; i < displayOptions.length; i++) {
					const opt = displayOptions[i];
					const isFreeform = opt.isFreeform === true;
					const focused = i === optionIndex;
					const checked = selected.has(i);
					let prefix = "  ";
					if (allowMultiple && !isFreeform) {
						prefix = checked ? theme.fg("accent", "[x] ") : "[ ] ";
					} else if (focused) {
						prefix = theme.fg("accent", "> ");
					}

					const num = `${i + 1}. `;
					const label = opt.title;
					if (isFreeform && editMode && focused) {
						add(prefix + theme.fg("accent", `${num}${label} ✎`));
					} else if (focused && !allowMultiple) {
						add(prefix + theme.fg("accent", `${num}${label}`));
					} else {
						add(`${prefix}${theme.fg("text", `${num}${label}`)}`);
					}

					if (opt.description) {
						add(`     ${theme.fg("muted", opt.description)}`);
					}
				}

				if (editMode) {
					lines.push("");
					add(theme.fg("muted", " Your answer:"));
					for (const line of editor.render(width - 2)) {
						add(` ${line}`);
					}
				}

				lines.push("");
				if (editMode) {
					add(theme.fg("dim", " Enter to submit • Esc to go back"));
				} else if (allowMultiple) {
					add(
						theme.fg(
							"dim",
							" ↑↓ navigate • Space toggle • Enter confirm • Esc cancel",
						),
					);
				} else {
					add(
						theme.fg("dim", " ↑↓ navigate • Enter to select • Esc to cancel"),
					);
				}

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
		}),
		validated.timeout,
	);

	if (!result) {
		return { response: null, cancelled: true };
	}

	return { response: result.response, cancelled: false };
}
