import type { AskUserParams } from "./types.js";

/** Match plan-approval option labels — keep in sync with plan-approval/types. */
export const PLAN_APPROVE_OPTION =
	/^(approve(d)?(\s+plan)?|yes,?\s+proceed|looks\s+good)$/i;
export const PLAN_CANCEL_OPTION =
	/^(cancel(led)?|revise|request\s+changes|needs?\s+clarification)$/i;

const PLAN_APPROVAL_PHRASE = /plan|approve/i;

function optionTitlesFromParams(input: {
	options?: unknown[];
	questions?: unknown[];
}): string[] {
	const titles: string[] = [];
	for (const o of input.options ?? []) {
		if (typeof o === "string") titles.push(o.trim());
		else if (o && typeof o === "object" && "title" in o) {
			titles.push(String((o as { title?: string }).title ?? "").trim());
		}
	}
	for (const q of input.questions ?? []) {
		if (q && typeof q === "object" && "title" in q) {
			titles.push(String((q as { title?: string }).title ?? "").trim());
		}
		if (q && typeof q === "object" && "options" in q) {
			const qOpts = (q as { options?: unknown[] }).options ?? [];
			for (const o of qOpts) {
				if (typeof o === "string") titles.push(o.trim());
				else if (o && typeof o === "object" && "title" in o) {
					titles.push(String((o as { title?: string }).title ?? "").trim());
				}
			}
		}
	}
	return titles.filter(Boolean);
}

/** Detect ask_user calls that duplicate plan approval (must use approve_plan). */
export function isPlanApprovalAskUser(input: {
	question?: string;
	options?: unknown[];
	questions?: unknown[];
}): boolean {
	const q = String(input.question ?? "").trim();
	const titles = optionTitlesFromParams(input);
	const hasPlanOptions =
		titles.some(
			(t) => PLAN_APPROVE_OPTION.test(t) || PLAN_CANCEL_OPTION.test(t),
		) || PLAN_APPROVE_OPTION.test(q);
	if (!hasPlanOptions) return false;
	return PLAN_APPROVAL_PHRASE.test(q);
}

/** True when harness setup/CI forbids interactive prompts. */
export function isHarnessNonInteractive(): boolean {
	return (
		process.env.HARNESS_NON_INTERACTIVE === "1" ||
		process.env.HARNESS_PLAN_NONINTERACTIVE === "1" ||
		process.argv.some((a) => a === "-p" || a === "--print") ||
		process.argv.some((a) => a.includes("non-interactive"))
	);
}

/** Prefer headless ask_user UI (print mode, CI, or non-TTY stdin). */
export function isHeadlessAskUserContext(): boolean {
	return isHarnessNonInteractive() || !process.stdin.isTTY;
}

/** Cursor Composer / agent runs set CURSOR_AGENT=1; Glimpse WebView often returns null there. */
export function isCursorAgentContext(): boolean {
	const v = process.env.CURSOR_AGENT;
	return v === "1" || v === "true";
}

/**
 * Prefer terminal TUI over Glimpse when auto-routing (unless HARNESS_ASK_USER_UI=glimpse).
 */
export function shouldPreferTuiOverGlimpse(): boolean {
	const forced = process.env.HARNESS_ASK_USER_UI?.toLowerCase();
	if (forced === "glimpse") return false;
	if (forced === "tui" || forced === "headless") return forced === "tui";
	return isCursorAgentContext();
}

export function assertSubagentCannotAskUser(agentType: string | undefined): {
	blocked: boolean;
	reason?: string;
} {
	if (!agentType) return { blocked: false };
	if (agentType.startsWith("harness/reviewing/")) {
		return {
			blocked: true,
			reason: `Tool "ask_user" is not available for ${agentType} (orchestrator-only).`,
		};
	}
	if (agentType.startsWith("harness/planning/")) {
		return {
			blocked: true,
			reason: `Tool "ask_user" is not available for ${agentType} (orchestrator-only).`,
		};
	}
	if (agentType === "harness/running/executor") {
		return {
			blocked: true,
			reason: `Tool "ask_user" is not available for ${agentType} (orchestrator-only).`,
		};
	}
	return { blocked: false };
}

export function nonInteractiveAskUserResult(question: string): {
	text: string;
	details: Partial<import("./types.js").AskToolDetails>;
} {
	return {
		text: "ask_user blocked in non-interactive mode — set needs_clarification; do not guess defaults.",
		details: {
			question,
			options: [],
			response: null,
			cancelled: true,
			ui_backend: "headless",
			non_interactive_blocked: true,
		},
	};
}
