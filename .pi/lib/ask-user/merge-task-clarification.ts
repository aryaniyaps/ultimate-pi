import type { AskToolDetails } from "./types.js";

export type TaskClarificationDoc = Record<string, unknown>;

const TITLE_ALIASES: Record<string, string[]> = {
	success_definition: [
		"done",
		"success",
		"success criteria",
		"what does done look like",
	],
	risk_level: ["risk", "risk level"],
	in_scope: ["scope", "in scope", "what is in scope"],
};

function normalizeKey(s: string): string {
	return s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function matchField(title: string): string | null {
	const n = normalizeKey(title);
	for (const [field, aliases] of Object.entries(TITLE_ALIASES)) {
		if (aliases.some((a) => n.includes(normalizeKey(a)))) return field;
	}
	return null;
}

function parseRiskLevel(answer: string): "low" | "med" | "high" | null {
	const n = answer.toLowerCase();
	if (/\blow\b/.test(n)) return "low";
	if (/\bhigh\b/.test(n)) return "high";
	if (/\bmed/.test(n) || /\bmedium\b/.test(n)) return "med";
	return null;
}

/**
 * Merge ask_user questionnaire or flat answers into a task-clarification draft.
 */
export function applyAskUserToTaskClarification(
	doc: TaskClarificationDoc,
	details: AskToolDetails,
): TaskClarificationDoc {
	const next = { ...doc };
	const assumptions = Array.isArray(next.assumptions)
		? [...(next.assumptions as string[])]
		: [];

	if (!details.response || details.cancelled) {
		return next;
	}

	const applyPair = (question: string, answer: string) => {
		const field = matchField(question);
		if (field === "success_definition") {
			next.success_definition = answer;
			return;
		}
		if (field === "risk_level") {
			const risk = parseRiskLevel(answer);
			if (risk) next.risk_level = risk;
			return;
		}
		if (field === "in_scope") {
			const items = answer
				.split(/[,;\n]/)
				.map((s) => s.trim())
				.filter(Boolean);
			if (items.length) next.in_scope = items;
			return;
		}
		assumptions.push(`${question}: ${answer}`);
	};

	const r = details.response;
	if (r.kind === "questionnaire") {
		for (const d of r.questionnaireDetails) {
			applyPair(d.question, d.answer);
		}
	} else if (r.kind === "freeform") {
		applyPair(details.question, r.text);
	} else if (r.kind === "selection") {
		applyPair(details.question, r.selections.join(", "));
	}

	if (assumptions.length) next.assumptions = assumptions;

	if (Array.isArray(next.unresolved_questions)) {
		next.unresolved_questions = [];
	}
	if (next.status === "draft" || next.status === "needs_user") {
		next.status = "needs_user";
	}
	next.user_engagement = {
		source: "ask_user",
		recorded_at: new Date().toISOString(),
	};
	next.clarification_rounds = (Number(next.clarification_rounds) || 0) + 1;

	return next;
}
