/** Keep in sync with validate.ts + format.ts — test entrypoint for node --test */

import { createRequire } from "node:module";
import { MAX_QUESTIONNAIRE_QUESTIONS } from "./constants.mjs";

const require = createRequire(import.meta.url);

/**
 * @param {string | { title: string, description?: string, recommended?: boolean }} raw
 */
export function normalizeOption(raw) {
	if (typeof raw === "string") {
		return { title: raw.trim() };
	}
	return {
		title: raw.title.trim(),
		description: raw.description?.trim() || undefined,
		recommended: raw.recommended === true ? true : undefined,
	};
}

function normalizeQuestion(raw) {
	const title = raw.title?.trim();
	if (!title) return "ask_user: each questions[] item requires title";

	const options = (raw.options ?? [])
		.map(normalizeOption)
		.filter((o) => o.title);
	if (options.length > 0 && options.length < 2) {
		return `ask_user: question "${title}" needs at least 2 options or omit options for freeform`;
	}

	return {
		title,
		description: raw.description?.trim() || undefined,
		options,
		allowMultiple: raw.allowMultiple === true,
	};
}

/** @param {import('./types.js').AskUserParams} params */
export function validateAskParams(params) {
	const question = params.question?.trim();
	if (!question) {
		return "ask_user: question is required";
	}

	const rawQuestions = params.questions ?? [];
	if (rawQuestions.length > MAX_QUESTIONNAIRE_QUESTIONS) {
		return `ask_user: at most ${MAX_QUESTIONNAIRE_QUESTIONS} questions in questionnaire mode`;
	}

	if (rawQuestions.length > 0 && (params.options?.length ?? 0) > 0) {
		return "ask_user: use either options or questions[], not both";
	}

	const questions = [];
	for (const q of rawQuestions) {
		const normalized = normalizeQuestion(q);
		if (typeof normalized === "string") return normalized;
		questions.push(normalized);
	}

	const options = (params.options ?? [])
		.map(normalizeOption)
		.filter((o) => o.title);
	if (options.length > 0 && options.length < 2) {
		return "ask_user: provide at least 2 options, or omit options for freeform-only";
	}

	const allowFreeform = params.allowFreeform !== false;
	const mode = questions.length > 0 ? "questionnaire" : "flat";

	if (mode === "flat" && options.length === 0 && !allowFreeform) {
		return "ask_user: options required when allowFreeform is false";
	}

	const displayMode =
		process.env.HARNESS_ASK_USER_DISPLAY_MODE === "inline"
			? "inline"
			: params.displayMode === "inline"
				? "inline"
				: "overlay";

	return {
		question,
		context: params.context?.trim() || undefined,
		contextFormat:
			params.contextFormat === "html" ? "html" : "markdown",
		options,
		questions,
		mode,
		allowMultiple: params.allowMultiple === true,
		allowFreeform,
		allowComment: params.allowComment === true,
		allowSkip: params.allowSkip === true,
		displayMode,
		timeout:
			typeof params.timeout === "number" && params.timeout > 0
				? params.timeout
				: undefined,
	};
}

/** @param {import('./types.js').AskResponse | null} response @param {boolean} cancelled @param {{ ui_degraded?: boolean }} [opts] */
export function formatResultText(response, cancelled, opts) {
	if (cancelled || !response) {
		return "User cancelled (no answer)";
	}
	if (opts?.ui_degraded) {
		return `Rich ask UI unavailable; using terminal prompt.\n\n${formatResponseBody(response)}`;
	}
	return formatResponseBody(response);
}

/** @param {import('./types.js').AskResponse} response */
function formatResponseBody(response) {
	if (response.kind === "freeform") {
		return `User wrote: ${response.text}`;
	}
	if (response.kind === "questionnaire") {
		const lines = response.questionnaireDetails.map((d) => {
			let line = `- ${d.question}: ${d.answer}`;
			if (d.comment) line += ` (comment: ${d.comment})`;
			return line;
		});
		return `User answered questionnaire:\n${lines.join("\n")}`;
	}
	if (response.selections.length === 1) {
		return `User selected: ${response.selections[0]}`;
	}
	return `User selected: ${response.selections.join(", ")}`;
}

/** @param {import('./types.js').ValidatedAskParams} validated */
export function toToolDetails(validated, response, cancelled, ui_backend = "headless", opts = {}) {
	const options =
		validated.mode === "questionnaire"
			? validated.questions.map((q) => q.title)
			: validated.options.map((o) => o.title);
	return {
		question: validated.question,
		context: validated.context,
		contextFormat: validated.contextFormat,
		options,
		response,
		cancelled,
		ui_backend,
		ui_degraded: opts.ui_degraded,
	};
}

export { isPlanApprovalAskUser } from "./policy.mjs";

/** @param {import('./types.js').ValidatedAskParams} validated */
export function buildGlimpsePayload(validated, sessionName) {
	const hasQuestions = validated.mode === "questionnaire";
	const hasOptions = validated.options.length > 0;
	let payloadType;
	if (hasQuestions) payloadType = "questionnaire";
	else if (!hasOptions) payloadType = "freeform";
	else if (validated.allowMultiple) payloadType = "multi-select";
	else payloadType = "single-select";

	let question = validated.question;
	let context = validated.context;
	if (!context && validated.question.length > 120) {
		const match = validated.question.match(/^(.+?[.?!])(\s+|$)/);
		if (match && match[0].length < validated.question.length) {
			question = match[1].trim();
			context = validated.question.slice(match[0].length).trim();
		}
	}

	return {
		type: payloadType,
		question,
		context,
		contextFormat: validated.contextFormat,
		options: validated.options.map((o) => ({
			title: o.title,
			description: o.description,
			recommended: o.recommended,
		})),
		questions: validated.questions.map((q) => ({
			title: q.title,
			description: q.description,
			allowMultiple: q.allowMultiple,
			options: q.options.map((o) => ({
				title: o.title,
				description: o.description,
				recommended: o.recommended,
			})),
		})),
		allowMultiple: validated.allowMultiple,
		allowFreeform: validated.allowFreeform,
		allowComment: validated.allowComment,
		allowSkip: validated.allowSkip,
		sessionName,
	};
}

function isGlimpseAvailable() {
	try {
		require.resolve("@alexleekt/pi-ask-user-glimpse/package.json");
		require.resolve("glimpseui");
		return true;
	} catch {
		return false;
	}
}

function isCursorAgentContext() {
	const v = process.env.CURSOR_AGENT;
	return v === "1" || v === "true";
}

function shouldPreferTuiOverGlimpse() {
	const forced = process.env.HARNESS_ASK_USER_UI?.toLowerCase();
	if (forced === "glimpse") return false;
	if (forced === "tui" || forced === "headless") return forced === "tui";
	return isCursorAgentContext();
}

/** @param {import('./types.js').ValidatedAskParams} validated @param {boolean} hasUI */
export function resolvePresenterChoice(validated, hasUI) {
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

/** @param {Record<string, unknown>} doc @param {import('./types.js').AskToolDetails} details */
export function applyAskUserToTaskClarification(doc, details) {
	const next = { ...doc };
	const assumptions = Array.isArray(next.assumptions) ? [...next.assumptions] : [];
	if (!details.response || details.cancelled) return next;

	const applyPair = (question, answer) => {
		const n = question.toLowerCase();
		if (n.includes("done") || n.includes("success")) {
			next.success_definition = answer;
			return;
		}
		if (n.includes("risk")) {
			const a = answer.toLowerCase();
			if (/\blow\b/.test(a)) next.risk_level = "low";
			else if (/\bhigh\b/.test(a)) next.risk_level = "high";
			else if (/\bmed/.test(a) || /\bmedium\b/.test(a)) next.risk_level = "med";
			return;
		}
		if (n.includes("scope") || n.includes("in scope")) {
			const items = answer.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
			if (items.length) next.in_scope = items;
			return;
		}
		assumptions.push(`${question}: ${answer}`);
	};

	const r = details.response;
	if (r.kind === "questionnaire") {
		for (const d of r.questionnaireDetails) applyPair(d.question, d.answer);
	} else if (r.kind === "freeform") {
		applyPair(details.question, r.text);
	} else if (r.kind === "selection") {
		applyPair(details.question, r.selections.join(", "));
	}

	if (assumptions.length) next.assumptions = assumptions;
	if (Array.isArray(next.unresolved_questions)) next.unresolved_questions = [];
	return next;
}
