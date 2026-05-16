export interface NormalizedOption {
	title: string;
	description?: string;
}

export type AskResponse =
	| { kind: "selection"; selections: string[] }
	| { kind: "freeform"; text: string };

export interface AskToolDetails {
	question: string;
	context?: string;
	options: string[];
	response: AskResponse | null;
	cancelled: boolean;
}

export interface AskUserParams {
	question: string;
	context?: string;
	options?: Array<string | { title: string; description?: string }>;
	allowMultiple?: boolean;
	allowFreeform?: boolean;
	displayMode?: "overlay" | "inline";
	timeout?: number;
}

export interface ValidatedAskParams {
	question: string;
	context?: string;
	options: NormalizedOption[];
	allowMultiple: boolean;
	allowFreeform: boolean;
	displayMode: "overlay" | "inline";
	timeout?: number;
}

export interface DialogResult {
	response: AskResponse | null;
	cancelled: boolean;
}
