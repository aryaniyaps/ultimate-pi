/**
 * Persisted plan-debate eligibility snapshot for gate pass-through.
 */

import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { DebateEligibilityResult } from "./plan-debate-eligibility.js";

export const PLAN_DEBATE_ELIGIBILITY_ARTIFACT =
	"artifacts/plan-debate-eligibility.yaml";

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

export async function writePlanDebateEligibilitySnapshot(
	runDir: string,
	result: DebateEligibilityResult,
): Promise<string> {
	const rel = PLAN_DEBATE_ELIGIBILITY_ARTIFACT;
	const abs = join(runDir, rel);
	await mkdir(dirname(abs), { recursive: true });
	const doc = {
		schema_version: "1.0.0",
		captured_at: new Date().toISOString(),
		profile: result.profile,
		required_focuses: result.required_focuses,
		min_focus_rounds: result.review_gate_strategy.min_focus_rounds,
		max_rounds: result.max_rounds,
		max_exchanges_per_round: result.max_exchanges_per_round,
		round_token_cap: result.round_token_cap,
		debate_global_cap: result.debate_global_cap,
		human_required: result.human_required,
		rationale: result.rationale,
		review_gate_strategy: result.review_gate_strategy,
	};
	await writeFile(abs, stringifyYaml(doc), "utf-8");
	return rel;
}

export async function loadPlanDebateEligibilitySnapshot(
	runDir: string,
): Promise<DebateEligibilityResult | null> {
	const abs = join(runDir, PLAN_DEBATE_ELIGIBILITY_ARTIFACT);
	if (!(await fileExists(abs))) return null;
	try {
		const raw = await readFile(abs, "utf-8");
		const doc = parseYaml(raw) as Record<string, unknown>;
		if (!doc || typeof doc !== "object") return null;
		const strategy = doc.review_gate_strategy as
			| DebateEligibilityResult["review_gate_strategy"]
			| undefined;
		if (!strategy?.mode) return null;
		return {
			profile: String(
				doc.profile ?? strategy.profile ?? "standard",
			) as DebateEligibilityResult["profile"],
			required_focuses: (doc.required_focuses ??
				strategy.required_focuses ??
				[]) as DebateEligibilityResult["required_focuses"],
			min_focus_rounds: Number(
				doc.min_focus_rounds ?? strategy.min_focus_rounds ?? 1,
			),
			max_rounds: Number(doc.max_rounds ?? strategy.max_rounds ?? 12),
			max_exchanges_per_round: Number(
				doc.max_exchanges_per_round ?? strategy.max_exchanges_per_round ?? 3,
			),
			round_token_cap: Number(
				doc.round_token_cap ?? strategy.round_token_cap ?? 8000,
			),
			debate_global_cap: Number(
				doc.debate_global_cap ?? strategy.debate_global_cap ?? 80000,
			),
			human_required: doc.human_required === true,
			rationale: Array.isArray(doc.rationale)
				? doc.rationale.map((r) => String(r))
				: [],
			review_gate_strategy: strategy,
		};
	} catch {
		return null;
	}
}
