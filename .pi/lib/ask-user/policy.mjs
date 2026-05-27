/** @sync .pi/lib/ask-user/policy.ts — test / node entrypoint */

export const PLAN_APPROVE_OPTION =
	/^(approve(d)?(\s+plan)?|yes,?\s+proceed|looks\s+good)$/i;
export const PLAN_CANCEL_OPTION =
	/^(cancel(led)?|revise|request\s+changes|needs?\s+clarification)$/i;

const PLAN_APPROVAL_PHRASE = /plan|approve/i;

function optionTitlesFromParams(input) {
	const titles = [];
	for (const o of input.options ?? []) {
		if (typeof o === "string") titles.push(o.trim());
		else if (o && typeof o === "object" && "title" in o) {
			titles.push(String(o.title ?? "").trim());
		}
	}
	for (const q of input.questions ?? []) {
		if (q && typeof q === "object" && "title" in q) {
			titles.push(String(q.title ?? "").trim());
		}
		if (q && typeof q === "object" && "options" in q) {
			for (const o of q.options ?? []) {
				if (typeof o === "string") titles.push(o.trim());
				else if (o && typeof o === "object" && "title" in o) {
					titles.push(String(o.title ?? "").trim());
				}
			}
		}
	}
	return titles.filter(Boolean);
}

export function isPlanApprovalAskUser(input) {
	const q = String(input.question ?? "").trim();
	const titles = optionTitlesFromParams(input);
	const hasPlanOptions =
		titles.some(
			(t) => PLAN_APPROVE_OPTION.test(t) || PLAN_CANCEL_OPTION.test(t),
		) || PLAN_APPROVE_OPTION.test(q);
	if (!hasPlanOptions) return false;
	return PLAN_APPROVAL_PHRASE.test(q);
}
