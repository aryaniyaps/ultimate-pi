/**
 * P0 — plan debate artifact + bus gates before approve_plan.
 */

import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { planDebateIdForRun } from "./plan-debate-id.js";
import {
	getMessengerRoundState,
	loadMessengerState,
	messengerRoundDebateReady,
} from "./plan-messenger.js";

const PLAN_ROUNDS = 4;
const FOCUS_BY_ROUND = ["spec", "wbs", "schedule", "quality"] as const;

function laneFilesForRound(roundIndex: number): string[] {
	const n = roundIndex;
	const lanes = [
		`artifacts/validation-turn-r${n}.yaml`,
		`artifacts/adversary-brief-r${n}.yaml`,
	];
	if (n === 1) {
		lanes.unshift(`artifacts/hypothesis-validation-r${n}.yaml`);
	}
	if (n === 4) {
		lanes.push(`artifacts/sprint-audit-r${n}.yaml`);
	}
	lanes.push(`artifacts/review-round-r${n}.yaml`);
	return lanes;
}

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

	for (let r = 1; r <= PLAN_ROUNDS; r++) {
		for (const rel of laneFilesForRound(r)) {
			const abs = join(runDir, rel);
			if (!(await fileExists(abs))) {
				errors.push(`missing ${rel}`);
			}
		}
		const roundState = await getMessengerRoundState(runDir, r);
		const messengerCheck = messengerRoundDebateReady(roundState, r === 4);
		if (!messengerCheck.ok) {
			for (const e of messengerCheck.errors) {
				errors.push(`round ${r} messenger: ${e}`);
			}
		}
	}

	const messenger = await loadMessengerState(runDir);
	if (!messenger) {
		errors.push(
			"debate-messenger/state.json missing — call harness_debate_open",
		);
	} else if (messenger.debate_id !== debateId) {
		errors.push(`messenger debate_id ${messenger.debate_id} !== ${debateId}`);
	}

	const jsonlPath = join(debatesDir, `${debateId}.jsonl`);
	const { rounds, hasConsensus } = await countJsonlKinds(jsonlPath);
	if (rounds < PLAN_ROUNDS) {
		errors.push(
			`${debateId}.jsonl has ${rounds}/${PLAN_ROUNDS} round events — use harness_debate_submit_round each round`,
		);
	}
	if (!hasConsensus) {
		errors.push(
			`missing consensus on ${debateId} — call harness_debate_consensus`,
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

	for (let r = 0; r < FOCUS_BY_ROUND.length; r++) {
		const focus = FOCUS_BY_ROUND[r];
		const reviewPath = join(runDir, `artifacts/review-round-r${r + 1}.yaml`);
		if (await fileExists(reviewPath)) {
			const raw = await readFile(reviewPath, "utf-8");
			if (!raw.includes(focus)) {
				warnings.push(`review-round-r${r + 1} may not match focus ${focus}`);
			}
		}
	}

	return {
		ok: errors.length === 0,
		errors,
		warnings,
		debateId,
	};
}

export function isReviewRoundArtifactPath(relPath: string): boolean {
	return /^artifacts\/review-round-r\d+\.yaml$/i.test(
		relPath.replace(/\\/g, "/"),
	);
}
