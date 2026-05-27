/**
 * Synced with @alexleekt/pi-ask-user-glimpse@0.5.1 shared/ask-user.ts — harness-owned payload contract.
 */

export interface GlimpseQuestionOption {
	title: string;
	description?: string;
	recommended?: boolean;
}

export interface GlimpseQuestion {
	title: string;
	description?: string;
	options?: GlimpseQuestionOption[];
	allowMultiple?: boolean;
}

export type GlimpsePayloadType =
	| "single-select"
	| "multi-select"
	| "questionnaire"
	| "freeform";

export interface GlimpseAskUserPayload {
	type: GlimpsePayloadType;
	question: string;
	context?: string;
	contextFormat?: "markdown" | "html";
	options: GlimpseQuestionOption[];
	questions?: GlimpseQuestion[];
	allowMultiple: boolean;
	allowFreeform: boolean;
	allowComment: boolean;
	allowSkip?: boolean;
	sessionName?: string;
}

export const GLIMPSE_FREEFORM_OPTION_TITLE = "My answer isn't listed above";
