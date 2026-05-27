export interface NormalizedOption {
	title: string;
	description?: string;
	recommended?: boolean;
}

export interface NormalizedQuestion {
	title: string;
	description?: string;
	options: NormalizedOption[];
	allowMultiple: boolean;
}

export type QuestionnaireDetail = {
	question: string;
	answer: string;
	kind: "selection" | "freeform";
	comment?: string;
};

export type AskResponse =
	| {
			kind: "selection";
			selections: string[];
			comment?: string;
			additionalComments?: string;
	  }
	| { kind: "freeform"; text: string; additionalComments?: string }
	| {
			kind: "questionnaire";
			questionnaireDetails: QuestionnaireDetail[];
			additionalComments?: string;
	  };

export type UiBackend = "tui" | "glimpse" | "headless";

export interface AskToolDetails {
	question: string;
	context?: string;
	contextFormat?: "markdown" | "html";
	options: string[];
	response: AskResponse | null;
	cancelled: boolean;
	ui_backend: UiBackend;
	ui_degraded?: boolean;
	non_interactive_blocked?: boolean;
}

export interface AskUserParams {
	question: string;
	context?: string;
	contextFormat?: "markdown" | "html";
	options?: Array<
		string | { title: string; description?: string; recommended?: boolean }
	>;
	questions?: Array<{
		title: string;
		description?: string;
		options?: Array<
			string | { title: string; description?: string; recommended?: boolean }
		>;
		allowMultiple?: boolean;
	}>;
	allowMultiple?: boolean;
	allowFreeform?: boolean;
	allowComment?: boolean;
	allowSkip?: boolean;
	displayMode?: "overlay" | "inline";
	timeout?: number;
}

export interface ValidatedAskParams {
	question: string;
	context?: string;
	contextFormat: "markdown" | "html";
	/** Flat single/multi-select mode */
	options: NormalizedOption[];
	questions: NormalizedQuestion[];
	mode: "flat" | "questionnaire";
	allowMultiple: boolean;
	allowFreeform: boolean;
	allowComment: boolean;
	allowSkip: boolean;
	displayMode: "overlay" | "inline";
	timeout?: number;
}

export interface DialogResult {
	response: AskResponse | null;
	cancelled: boolean;
	ui_backend: UiBackend;
	ui_degraded?: boolean;
}

export interface RunAskUserResult {
	content: { type: "text"; text: string }[];
	details: AskToolDetails;
}
