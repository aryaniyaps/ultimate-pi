import type { Diagnostic } from "./dispatch/types.js";

export const LENS_EVENT_VERSION = 1;

export const LENS_EVENT_NAMES = {
	analysisComplete: "pi-lens/analysis-complete",
	findings: "pi-lens/findings",
	turnFindings: "pi-lens/turn-findings",
} as const;

type LensEventName = (typeof LENS_EVENT_NAMES)[keyof typeof LENS_EVENT_NAMES];

type LensEventBus = {
	emit?: (event: string, payload: unknown) => void;
};

export interface LensTelemetryPayload {
	model: string;
	sessionId: string;
	turnIndex: number;
	writeIndex: number;
}

export interface LensAnalysisPayload extends LensTelemetryPayload {
	version: typeof LENS_EVENT_VERSION;
	source: "pi-lens";
	timestamp: string;
	cwd: string;
	filePath: string;
	toolName: string;
	diagnostics: Diagnostic[];
	blockers: Diagnostic[];
	warnings: Diagnostic[];
	fixed: Diagnostic[];
	resolvedCount: number;
	hasBlockers: boolean;
	fileModified: boolean;
	changedFiles: string[];
	durationMs: number;
}

export interface LensTurnFindingsPayload {
	version: typeof LENS_EVENT_VERSION;
	source: "pi-lens";
	timestamp: string;
	cwd: string;
	filePaths: string[];
	sessionId: string;
	turnIndex: number;
	blockerSections: number;
	advisorySections: number;
	content: string;
}

let lensEventBus: LensEventBus | undefined;

export function initLensEvents(pi: { events?: LensEventBus }): void {
	lensEventBus = pi.events;
}

function truncateText(
	value: string | undefined,
	maxChars: number,
): string | undefined {
	if (value === undefined) return undefined;
	if (value.length <= maxChars) return value;
	return `${value.slice(0, maxChars)}…`;
}

function normalizeDiagnostic(diagnostic: Diagnostic): Diagnostic {
	return {
		...diagnostic,
		message: truncateText(diagnostic.message, 1_000) ?? "",
		matchedText: truncateText(diagnostic.matchedText, 500),
		fixSuggestion: truncateText(diagnostic.fixSuggestion, 500),
	};
}

function normalizeDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
	return diagnostics.map(normalizeDiagnostic);
}

function emitLensEvent(eventName: LensEventName, payload: unknown): void {
	const emit = lensEventBus?.emit;
	if (!emit) return;

	setImmediate(() => {
		try {
			emit.call(lensEventBus, eventName, payload);
		} catch {
			// Inter-extension events are observational. A listener must never break
			// the pi-lens hook path or delay agent progress with error handling noise.
		}
	});
}

export function emitLensAnalysisComplete(
	payload: Omit<
		LensAnalysisPayload,
		| "version"
		| "source"
		| "timestamp"
		| "diagnostics"
		| "blockers"
		| "warnings"
		| "fixed"
	> & {
		diagnostics: Diagnostic[];
		blockers: Diagnostic[];
		warnings: Diagnostic[];
		fixed: Diagnostic[];
	},
): void {
	const normalized: LensAnalysisPayload = {
		version: LENS_EVENT_VERSION,
		source: "pi-lens",
		timestamp: new Date().toISOString(),
		...payload,
		diagnostics: normalizeDiagnostics(payload.diagnostics),
		blockers: normalizeDiagnostics(payload.blockers),
		warnings: normalizeDiagnostics(payload.warnings),
		fixed: normalizeDiagnostics(payload.fixed),
	};

	emitLensEvent(LENS_EVENT_NAMES.analysisComplete, normalized);
	if (
		normalized.diagnostics.length > 0 ||
		normalized.blockers.length > 0 ||
		normalized.warnings.length > 0 ||
		normalized.fixed.length > 0
	) {
		emitLensEvent(LENS_EVENT_NAMES.findings, normalized);
	}
}

export function emitLensTurnFindings(
	payload: Omit<
		LensTurnFindingsPayload,
		"version" | "source" | "timestamp" | "content"
	> & {
		content: string;
	},
): void {
	emitLensEvent(LENS_EVENT_NAMES.turnFindings, {
		version: LENS_EVENT_VERSION,
		source: "pi-lens",
		timestamp: new Date().toISOString(),
		...payload,
		content: truncateText(payload.content, 8_000) ?? "",
	} satisfies LensTurnFindingsPayload);
}
