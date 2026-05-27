import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import type { DialogResult, ValidatedAskParams } from "../types.js";

export interface PresenterContext {
	ui: ExtensionUIContext;
	hasUI: boolean;
	sessionName?: string;
}

export type AskUserPresenter = (
	validated: ValidatedAskParams,
	ctx: PresenterContext,
) => Promise<DialogResult>;
