import type { AgentToolResult } from "@earendil-works/pi-agent-core";
import type {
	Theme,
	ToolRenderResultOptions,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import type { AskToolDetails } from "./types.js";

export function renderAskCall(
	args: Record<string, unknown>,
	theme: Theme,
): Text {
	let text =
		theme.fg("toolTitle", theme.bold("ask_user ")) +
		theme.fg("muted", String(args.question ?? ""));
	if (args.context) {
		text += `\n${theme.fg("dim", `  ${String(args.context)}`)}`;
	}
	const opts = Array.isArray(args.options) ? args.options : [];
	if (opts.length) {
		const labels = opts.map((o: unknown) =>
			typeof o === "string" ? o : ((o as { title?: string })?.title ?? "?"),
		);
		const numbered = labels.map((o, i) => `${i + 1}. ${o}`);
		if (args.allowFreeform !== false) {
			numbered.push(`${numbered.length + 1}. Type something…`);
		}
		text += `\n${theme.fg("dim", `  Options: ${numbered.join(", ")}`)}`;
	}
	return new Text(text, 0, 0);
}

export function renderAskResult(
	result: AgentToolResult<unknown>,
	_options: ToolRenderResultOptions,
	theme: Theme,
): Text {
	const details = result.details as AskToolDetails | undefined;
	if (!details) {
		const block = result.content[0];
		return new Text(block?.type === "text" ? block.text : "", 0, 0);
	}

	if (details.cancelled || !details.response) {
		return new Text(theme.fg("warning", "Cancelled"), 0, 0);
	}

	if (details.response.kind === "freeform") {
		return new Text(
			theme.fg("success", "✓ ") +
				theme.fg("muted", "(wrote) ") +
				theme.fg("accent", details.response.text),
			0,
			0,
		);
	}

	const sel = details.response.selections;
	const display =
		sel.length === 1 ? sel[0] : sel.map((s, i) => `${i + 1}. ${s}`).join(", ");
	return new Text(
		theme.fg("success", "✓ ") + theme.fg("accent", display),
		0,
		0,
	);
}
