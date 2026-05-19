/**
 * P0 — plan debate artifact + bus gates before approve_plan.
 */

import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { capsForDebate } from "./debate-bus-core.js";
import {
	getPlanFocusCoverage,
	type PlanDebateFocus,
	planDebateOutcomeComplete,
} from "./plan-debate-focus.js";
import { planDebateIdForRun } from "./plan-debate-id.js";
import { laneArtifactPathsForRound } from "./plan-debate-lanes.js";
import {
	getMessengerRoundState,
	loadMessengerState,
	messengerRoundDebateReady,
} from "./plan-messenger.js";

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

async function countJsonlKinds(
	debateJsonlPath: string,
): Promise<{ rounds: number; hasConsensus: boolean }> {
	try {
		const raw = await readFile(debateJsonlPath, "utf-8");
		let rounds = 0;
		let hasConsensus = false;
		for (const line of raw.split("\n")) {
			if (!line.trim()) continue;
			const ev = JSON.parse(line) as { kind?: string };
			if (ev.kind === "round") rounds += 1;
			if (ev.kind === "consensus") hasConsensus = true;
		}
		return { rounds, hasConsensus };
	} catch {
		return { rounds: 0, hasConsensus: false };
	}
}

export interface PlanDebateGateResult {
	ok: boolean;
	errors: string[];
	warnings: string[];
	debateId: string;
	focus_coverage?: {
		covered: string[];
		missing: string[];
		last_review_gate_ready: boolean;
	};
	debate_profile?: string;
}

export async function validatePlanDebateGate(
	projectRoot: string,
	runId: string,
): Promise<PlanDebateGateResult> {
	const errors: string[] = [];
	const warnings: string[] = [];
	const debateId = planDebateIdForRun(runId);
	const runDir = join(projectRoot, ".pi", "harness", "runs", runId);
	const debatesDir = join(projectRoot, ".pi", "harness", "debates");
	const messenger = await loadMessengerState(runDir);
	const debateProfile = messenger?.debate_profile ?? "standard";
	const requiredFocuses: readonly PlanDebateFocus[] =
		messenger?.required_focuses && messenger.required_focuses.length > 0
			? messenger.required_focuses
			: (["spec", "wbs", "schedule", "quality"] as const);
	const caps = capsForDebate(debateId, debateProfile);
	const coverage = await getPlanFocusCoverage(runDir, { requiredFocuses });
	const dialogueOpts = {
		max_exchanges_per_round: caps.max_exchanges_per_round,
	};

	for (const focus of coverage.missing) {
		errors.push(`focus not covered in submitted rounds: ${focus}`);
	}
	if (!coverage.last_review_gate_ready) {
		errors.push("last submitted review round has review_gate_ready !== true");
	}

	const roundIndices = [
		...new Set(
			Object.values(coverage.rounds_by_focus).filter(
				(v): v is number => typeof v === "number",
			),
		),
	];
	for (const r of roundIndices) {
		const focus = coverage.focus_by_round[r] ?? null;
		for (const rel of laneArtifactPathsForRound(r, focus)) {
			const abs = join(runDir, rel);
			if (!(await fileExists(abs))) {
				errors.push(`missing ${rel}`);
			}
		}
		const roundState = await getMessengerRoundState(runDir, r);
		const requireSprint = focus === "quality" || r >= 4;
		const messengerCheck = messengerRoundDebateReady(
			roundState,
			requireSprint,
			dialogueOpts,
		);
		if (!messengerCheck.ok) {
			for (const e of messengerCheck.errors) {
				errors.push(`round ${r} messenger: ${e}`);
			}
		}
	}

	if (coverage.last_round_index > caps.max_rounds) {
		errors.push(
			`round_count ${coverage.last_round_index} exceeds max_rounds ${caps.max_rounds}`,
		);
	}

	if (!messenger) {
		errors.push(
			"debate-messenger/state.json missing — call harness_debate_open",
		);
	} else if (messenger.debate_id !== debateId) {
		errors.push(`messenger debate_id ${messenger.debate_id} !== ${debateId}`);
	}

	const jsonlPath = join(debatesDir, `${debateId}.jsonl`);
	const { rounds, hasConsensus } = await countJsonlKinds(jsonlPath);
	const minRounds = caps.min_focus_rounds;
	if (rounds < minRounds) {
		errors.push(
			`${debateId}.jsonl has ${rounds}/${minRounds} minimum round events — use harness_debate_submit_round per focus`,
		);
	}
	if (!hasConsensus) {
		errors.push(
			`missing consensus on ${debateId} — call harness_debate_consensus`,
		);
	}

	if (
		!planDebateOutcomeComplete(coverage, {
			requiredFocuses,
			minRoundIndex: caps.min_focus_rounds,
		})
	) {
		errors.push(
			`debate outcome incomplete: required focuses [${requiredFocuses.join(", ")}] with last review_gate_ready true (profile=${debateProfile})`,
		);
	}

	const consensusPath = join(debatesDir, `${debateId}.consensus.json`);
	if (!(await fileExists(consensusPath))) {
		errors.push(`missing ${debateId}.consensus.json`);
	} else {
		try {
			const raw = await readFile(consensusPath, "utf-8");
			const packet = JSON.parse(raw) as { policy_decision?: string };
			if (packet.policy_decision === "block") {
				errors.push("consensus policy_decision is block — cannot approve");
			}
		} catch {
			errors.push("invalid consensus json");
		}
	}

	if (rounds > caps.max_rounds) {
		warnings.push(
			`bus round count ${rounds} exceeds soft max_rounds ${caps.max_rounds}`,
		);
	}

	return {
		ok: errors.length === 0,
		errors,
		warnings,
		debateId,
		focus_coverage: {
			covered: coverage.covered,
			missing: coverage.missing,
			last_review_gate_ready: coverage.last_review_gate_ready,
		},
		debate_profile: debateProfile,
	};
}

export function isReviewRoundArtifactPath(relPath: string): boolean {
	return /^artifacts\/review-round-r\d+\.yaml$/i.test(
		relPath.replace(/\\/g, "/"),
	);
}
