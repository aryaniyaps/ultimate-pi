/**
 * P1 — integrator draft rules (disputes required when checks fail).
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export interface IntegratorValidationResult {
	ok: boolean;
	review_gate_ready: boolean;
	errors: string[];
	warnings: string[];
}

function hasFailedChecks(doc: Record<string, unknown>): boolean {
	const pe = doc.plan_evaluation as Record<string, unknown> | undefined;
	if (!pe) return false;
	for (const [key, val] of Object.entries(pe)) {
		if (key === "source") continue;
		const block = val as Record<string, unknown> | undefined;
		if (block && block.passes === false) return true;
		const checks = block?.issues as unknown[] | undefined;
		if (Array.isArray(checks) && checks.length > 0) {
			// issues on passing blocks are warnings only
		}
	}
	const hv = doc.hypothesis_validation as Record<string, unknown> | undefined;
	if (hv?.revision_recommended === true) return true;
	if (
		hv?.relevance &&
		(hv.relevance as { passes?: boolean }).passes === false
	) {
		return true;
	}
	return false;
}

function adversarySeverityHigh(doc: Record<string, unknown>): boolean {
	const ab = doc.adversary_brief as Record<string, unknown> | undefined;
	const sev = String(ab?.severity ?? "").toLowerCase();
	return sev === "high" || sev === "critical";
}

export function validateIntegratorDraft(
	draft: Record<string, unknown>,
	opts?: { validationTurn?: Record<string, unknown> | null },
): IntegratorValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const disputes = Array.isArray(draft.disputes)
		? (draft.disputes as string[]).filter(Boolean)
		: [];
	const unresolved = (
		draft.review_integrator_summary as Record<string, unknown> | undefined
	)?.debate_health as Record<string, unknown> | undefined;
	const unresolvedTensions = Array.isArray(unresolved?.unresolved_tensions)
		? (unresolved.unresolved_tensions as string[])
		: [];
	let review_gate_ready = draft.review_gate_ready === true;

	const failedInDraft = hasFailedChecks(draft);
	const failedInTurn =
		opts?.validationTurn?.overall_ready === false ||
		(Array.isArray(opts?.validationTurn?.checks) &&
			(opts.validationTurn.checks as { status?: string }[]).some(
				(c) => c.status === "fail",
			));

	if (failedInDraft || failedInTurn) {
		if (disputes.length === 0) {
			errors.push(
				"evaluator reported failed/warn checks but disputes[] is empty — document tension",
			);
			review_gate_ready = false;
		}
		if (unresolvedTensions.length === 0 && disputes.length > 0) {
			warnings.push(
				"disputes present but unresolved_tensions empty — prefer listing open items",
			);
		}
	}

	if (adversarySeverityHigh(draft) && disputes.length === 0) {
		errors.push("adversary severity is high but no disputes recorded");
		review_gate_ready = false;
	}

	if (
		review_gate_ready &&
		(failedInDraft || failedInTurn) &&
		disputes.length === 0
	) {
		errors.push(
			"review_gate_ready cannot be true without disputes when checks fail",
		);
		review_gate_ready = false;
	}

	return {
		ok: errors.length === 0,
		review_gate_ready,
		errors,
		warnings,
	};
}

export async function loadValidationTurnYaml(
	runDir: string,
	roundIndex: number,
): Promise<Record<string, unknown> | null> {
	const path = join(runDir, "artifacts", `validation-turn-r${roundIndex}.yaml`);
	try {
		const raw = await readFile(path, "utf-8");
		return parseYaml(raw) as Record<string, unknown>;
	} catch {
		return null;
	}
}
