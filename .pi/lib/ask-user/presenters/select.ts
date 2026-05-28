import {
	isHeadlessAskUserContext,
	shouldPreferTuiOverGlimpse,
} from "../policy.js";
import type { DialogResult, UiBackend, ValidatedAskParams } from "../types.js";
import { isGlimpseAvailable, runGlimpsePresenter } from "./glimpse.js";
import { runHeadlessPresenter } from "./headless.js";
import { runTuiPresenter } from "./tui.js";
import type { PresenterContext } from "./types.js";

export type PresenterChoice = UiBackend;

export function resolvePresenterChoice(
	validated: ValidatedAskParams,
	hasUI: boolean,
): PresenterChoice {
	if (isHeadlessAskUserContext()) return "headless";
	if (validated.displayMode === "inline") return "tui";

	const forced = process.env.HARNESS_ASK_USER_UI?.toLowerCase();
	if (forced === "tui") return "tui";
	if (forced === "glimpse") return "glimpse";
	if (forced === "headless") return "headless";

	if (shouldPreferTuiOverGlimpse()) {
		if (hasUI) return "tui";
		return "headless";
	}

	if (hasUI && isGlimpseAvailable()) return "glimpse";
	if (hasUI) return "tui";
	return "headless";
}

async function runPresenter(
	choice: PresenterChoice,
	validated: ValidatedAskParams,
	ctx: PresenterContext,
): Promise<DialogResult> {
	switch (choice) {
		case "glimpse":
			return runGlimpsePresenter(validated, ctx);
		case "headless":
			return runHeadlessPresenter(ctx.ui, validated);
		default:
			return runTuiPresenter(ctx.ui, validated);
	}
}

/**
 * Run ask_user UI with glimpse→tui degradation on failure.
 */
export async function presentAskUser(
	validated: ValidatedAskParams,
	ctx: PresenterContext,
): Promise<DialogResult> {
	const choice = resolvePresenterChoice(validated, ctx.hasUI);

	if (choice === "glimpse") {
		try {
			return await runPresenter("glimpse", validated, ctx);
		} catch {
			const outcome = await runPresenter("tui", validated, ctx);
			return { ...outcome, ui_degraded: true };
		}
	}

	return runPresenter(choice, validated, ctx);
}
