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

type ThemeLike = { fg(color: string, text: string): string };
type TuiLike = ConstructorParameters<typeof Editor>[0] & {
	requestRender(): void;
};
type Done = (answer: CustomAnswer | null) => void;

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

function displayOptionsFor(validated: ValidatedAskParams): DisplayOption[] {
	const displayOptions: DisplayOption[] = [...validated.options];
	if (validated.allowFreeform) {
		displayOptions.push({ title: "Type something…", isFreeform: true });
	}
	return displayOptions;
}

async function runFreeformOnly(
	ui: ExtensionUIContext,
	question: string,
): Promise<DialogResult> {
	const text = await ui.input(question, "");
	if (!text?.trim()) return { response: null, cancelled: true };
	return {
		response: { kind: "freeform", text: text.trim() },
		cancelled: false,
	};
}

function editorThemeFor(theme: ThemeLike): EditorTheme {
	return {
		borderColor: (s) => theme.fg("accent", s),
		selectList: {
			selectedPrefix: (t) => theme.fg("accent", t),
			selectedText: (t) => theme.fg("accent", t),
			description: (t) => theme.fg("muted", t),
			scrollInfo: (t) => theme.fg("dim", t),
			noMatch: (t) => theme.fg("warning", t),
		},
	};
}

class AskDialogController {
	private optionIndex = 0;
	private editMode = false;
	private readonly selected = new Set<number>();
	private cachedLines: string[] | undefined;
	private readonly editor: Editor;

	constructor(
		private readonly validated: ValidatedAskParams,
		private readonly displayOptions: DisplayOption[],
		private readonly tui: TuiLike,
		private readonly theme: ThemeLike,
		private readonly done: Done,
	) {
		this.editor = new Editor(tui, editorThemeFor(theme));
		this.editor.onSubmit = (value) => this.submitFreeform(value);
	}

	invalidate(): void {
		this.cachedLines = undefined;
	}

	handleInput(data: string): void {
		if (this.editMode) {
			this.handleEditInput(data);
			return;
		}
		if (this.handleNavigationInput(data)) return;
		if (this.validated.allowMultiple && matchesKey(data, Key.space)) {
			this.toggleMultiSelect();
			return;
		}
		if (matchesKey(data, Key.enter)) this.submitSelection();
		if (matchesKey(data, Key.escape)) this.done(null);
	}

	render(width: number): string[] {
		if (this.cachedLines) return this.cachedLines;
		const lines: string[] = [];
		const add = (s: string) => lines.push(truncateToWidth(s, width));
		const useOverlay = this.validated.displayMode !== "inline";
		this.renderHeader(lines, add, width, useOverlay);
		this.renderOptions(add);
		this.renderEditor(lines, add, width);
		this.renderFooter(add, width, useOverlay);
		this.cachedLines = lines;
		return lines;
	}

	private refresh(): void {
		this.invalidate();
		this.tui.requestRender();
	}

	private submitFreeform(value: string): void {
		const trimmed = value.trim();
		if (trimmed) {
			this.done({ response: { kind: "freeform", text: trimmed } });
			return;
		}
		this.editMode = false;
		this.editor.setText("");
		this.refresh();
	}

	private submitSelection(): void {
		if (this.validated.allowMultiple) {
			const titles = [...this.selected]
				.sort((a, b) => a - b)
				.map((i) => this.displayOptions[i].title)
				.filter((t) => t !== "Type something…");
			if (titles.length) {
				this.done({ response: { kind: "selection", selections: titles } });
			}
			return;
		}
		const opt = this.displayOptions[this.optionIndex];
		if (opt.isFreeform) {
			this.editMode = true;
			this.refresh();
			return;
		}
		this.done({ response: { kind: "selection", selections: [opt.title] } });
	}

	private handleEditInput(data: string): void {
		if (matchesKey(data, Key.escape)) {
			this.editMode = false;
			this.editor.setText("");
		} else {
			this.editor.handleInput(data);
		}
		this.refresh();
	}

	private handleNavigationInput(data: string): boolean {
		if (matchesKey(data, Key.up)) {
			this.optionIndex = Math.max(0, this.optionIndex - 1);
			this.refresh();
			return true;
		}
		if (matchesKey(data, Key.down)) {
			this.optionIndex = Math.min(
				this.displayOptions.length - 1,
				this.optionIndex + 1,
			);
			this.refresh();
			return true;
		}
		return false;
	}

	private toggleMultiSelect(): void {
		const opt = this.displayOptions[this.optionIndex];
		if (opt.isFreeform) return;
		if (this.selected.has(this.optionIndex)) {
			this.selected.delete(this.optionIndex);
		} else {
			this.selected.add(this.optionIndex);
		}
		this.refresh();
	}

	private renderHeader(
		lines: string[],
		add: (s: string) => void,
		width: number,
		useOverlay: boolean,
	): void {
		if (useOverlay) add(this.theme.fg("accent", "─".repeat(width)));
		if (this.validated.context) {
			for (const line of this.validated.context.split("\n")) {
				add(this.theme.fg("muted", ` ${line}`));
			}
			lines.push("");
		}
		add(this.theme.fg("text", ` ${this.validated.question}`));
		lines.push("");
	}

	private renderOptions(add: (s: string) => void): void {
		for (let i = 0; i < this.displayOptions.length; i++) {
			const opt = this.displayOptions[i];
			const prefix = this.optionPrefix(i, opt.isFreeform === true);
			const label = this.optionLabel(i, opt);
			add(`${prefix}${label}`);
			if (opt.description)
				add(`     ${this.theme.fg("muted", opt.description)}`);
		}
	}

	private optionPrefix(index: number, isFreeform: boolean): string {
		if (!this.validated.allowMultiple) {
			return index === this.optionIndex ? this.theme.fg("accent", "> ") : "  ";
		}
		if (isFreeform) return "  ";
		return this.selected.has(index) ? this.theme.fg("accent", "[x] ") : "[ ] ";
	}

	private optionLabel(index: number, opt: DisplayOption): string {
		const raw = `${index + 1}. ${opt.title}`;
		const focused = index === this.optionIndex;
		if (opt.isFreeform && this.editMode && focused) {
			return this.theme.fg("accent", `${raw} ✎`);
		}
		if (focused && !this.validated.allowMultiple) {
			return this.theme.fg("accent", raw);
		}
		return this.theme.fg("text", raw);
	}

	private renderEditor(
		lines: string[],
		add: (s: string) => void,
		width: number,
	): void {
		if (!this.editMode) return;
		lines.push("");
		add(this.theme.fg("muted", " Your answer:"));
		for (const line of this.editor.render(width - 2)) add(` ${line}`);
	}

	private renderFooter(
		add: (s: string) => void,
		width: number,
		useOverlay: boolean,
	): void {
		add("");
		if (this.editMode) {
			add(this.theme.fg("dim", " Enter to submit • Esc to go back"));
		} else if (this.validated.allowMultiple) {
			add(
				this.theme.fg(
					"dim",
					" ↑↓ navigate • Space toggle • Enter confirm • Esc cancel",
				),
			);
		} else {
			add(
				this.theme.fg("dim", " ↑↓ navigate • Enter to select • Esc to cancel"),
			);
		}
		if (useOverlay) add(this.theme.fg("accent", "─".repeat(width)));
	}
}

async function runOptionDialog(
	ui: ExtensionUIContext,
	validated: ValidatedAskParams,
	displayOptions: DisplayOption[],
): Promise<CustomAnswer | null> {
	return withTimeout(
		ui.custom<CustomAnswer | null>((tui, theme, _kb, done) => {
			const controller = new AskDialogController(
				validated,
				displayOptions,
				tui as TuiLike,
				theme,
				done,
			);
			return {
				render: (width: number) => controller.render(width),
				invalidate: () => controller.invalidate(),
				handleInput: (data: string) => controller.handleInput(data),
			};
		}),
		validated.timeout,
	);
}

export async function runAskDialog(
	ui: ExtensionUIContext,
	validated: ValidatedAskParams,
): Promise<DialogResult> {
	const displayOptions = displayOptionsFor(validated);
	if (displayOptions.length === 0) {
		return runFreeformOnly(ui, validated.question);
	}
	const result = await runOptionDialog(ui, validated, displayOptions);
	if (!result) return { response: null, cancelled: true };
	return { response: result.response, cancelled: false };
}
