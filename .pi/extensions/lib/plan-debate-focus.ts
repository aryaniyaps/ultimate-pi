/**
 * Plan-phase Review Gate focus coverage (spec | wbs | schedule | quality).
 */

import { constants } from "node:fs";
import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export const PLAN_FOCUS_AREAS = ["spec", "wbs", "schedule", "quality"] as const;
export type PlanDebateFocus = (typeof PLAN_FOCUS_AREAS)[number];

export interface PlanFocusCoverage {
	covered: PlanDebateFocus[];
	missing: PlanDebateFocus[];
	rounds_by_focus: Partial<Record<PlanDebateFocus, number>>;
	focus_by_round: Partial<Record<number, PlanDebateFocus>>;
	last_review_gate_ready: boolean;
	last_round_index: number;
}

export interface PlanFocusCoverageOptions {
	requiredFocuses?: readonly PlanDebateFocus[];
}

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

function focusFromDraft(
	draft: Record<string, unknown>,
): PlanDebateFocus | null {
	const focus = String(draft.debate_round_focus ?? "").trim();
	if ((PLAN_FOCUS_AREAS as readonly string[]).includes(focus)) {
		return focus as PlanDebateFocus;
	}
	return null;
}

/**
 * Scan submitted review-round artifacts for focus coverage and last gate flag.
 */
export async function getPlanFocusCoverage(
	runDir: string,
	opts?: PlanFocusCoverageOptions,
): Promise<PlanFocusCoverage> {
	const required =
		opts?.requiredFocuses && opts.requiredFocuses.length > 0
			? opts.requiredFocuses
			: PLAN_FOCUS_AREAS;
	const artifactsDir = join(runDir, "artifacts");
	const covered = new Set<PlanDebateFocus>();
	const rounds_by_focus: Partial<Record<PlanDebateFocus, number>> = {};
	const focus_by_round: Partial<Record<number, PlanDebateFocus>> = {};
	let last_review_gate_ready = false;
	let last_round_index = 0;

	let files: string[] = [];
	try {
		files = (await readdir(artifactsDir)).filter((f) =>
			/^review-round-r\d+\.yaml$/i.test(f),
		);
	} catch {
		return {
			covered: [],
			missing: [...required],
			rounds_by_focus: {},
			focus_by_round: {},
			last_review_gate_ready: false,
			last_round_index: 0,
		};
	}

	for (const name of files.sort()) {
		const m = /^review-round-r(\d+)\.yaml$/i.exec(name);
		if (!m) continue;
		const roundIndex = Number(m[1]);
		if (roundIndex > last_round_index) last_round_index = roundIndex;
		const raw = await readFile(join(artifactsDir, name), "utf-8");
		let draft: Record<string, unknown>;
		try {
			draft = parseYaml(raw) as Record<string, unknown>;
		} catch {
			continue;
		}
		const focus = focusFromDraft(draft);
		if (focus) {
			covered.add(focus);
			rounds_by_focus[focus] = roundIndex;
			focus_by_round[roundIndex] = focus;
		}
		if (roundIndex === last_round_index) {
			last_review_gate_ready = draft.review_gate_ready === true;
		}
	}

	const coveredList = required.filter((f) => covered.has(f));
	const missing = required.filter((f) => !covered.has(f));

	return {
		covered: coveredList,
		missing,
		rounds_by_focus,
		focus_by_round,
		last_review_gate_ready,
		last_round_index,
	};
}

export interface PlanDebateOutcomeOptions {
	requiredFocuses?: readonly PlanDebateFocus[];
	minRoundIndex?: number;
}

export function planDebateOutcomeComplete(
	coverage: PlanFocusCoverage,
	opts?: PlanDebateOutcomeOptions,
): boolean {
	const required =
		opts?.requiredFocuses && opts.requiredFocuses.length > 0
			? opts.requiredFocuses
			: PLAN_FOCUS_AREAS;
	const minRounds = opts?.minRoundIndex ?? required.length;
	const missing = required.filter((f) => !coverage.covered.includes(f));
	return (
		missing.length === 0 &&
		coverage.last_review_gate_ready === true &&
		coverage.last_round_index >= minRounds
	);
}

/** Read debate_round_focus from an existing review-round artifact. */
export async function readDebateRoundFocus(
	runDir: string,
	roundIndex: number,
): Promise<PlanDebateFocus | null> {
	const path = join(runDir, "artifacts", `review-round-r${roundIndex}.yaml`);
	if (!(await fileExists(path))) return null;
	try {
		const raw = await readFile(path, "utf-8");
		const draft = parseYaml(raw) as Record<string, unknown>;
		return focusFromDraft(draft);
	} catch {
		return null;
	}
}
