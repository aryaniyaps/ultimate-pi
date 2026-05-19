/**
 * Shared in-process debate bus state (one session per Pi process).
 */

import type { DebateParticipant } from "../../lib/debate-orchestrator-types.js";
import type { DebateProfile } from "./plan-debate-eligibility.js";
import type { PlanDebateFocus } from "./plan-debate-focus.js";

export type DebatePhase = "plan" | "post_execute";

export interface DebateState {
	run_id: string;
	debate_id: string;
	debate_phase: DebatePhase;
	round_count: number;
	budget_used: number;
	min_focus_rounds: number;
	max_rounds: number;
	max_exchanges_per_round: number;
	round_token_cap: number;
	debate_global_cap: number;
	last_review_gate_ready?: boolean;
	debate_profile?: DebateProfile;
	required_focuses?: PlanDebateFocus[];
}

export interface SeverityScores {
	correctness: number;
	security: number;
	architecture: number;
	test_integrity: number;
}

let state: DebateState | null = null;
let lastSeverity: SeverityScores = {
	correctness: 0,
	security: 0,
	architecture: 0,
	test_integrity: 0,
};

export function getDebateState(): DebateState | null {
	return state;
}

export function setDebateState(next: DebateState | null): void {
	state = next;
}

export function getLastSeverity(): SeverityScores {
	return lastSeverity;
}

export function setLastSeverity(next: SeverityScores): void {
	lastSeverity = next;
}

export function restoreDebateStateFromEntry(data: unknown): void {
	if (data && typeof data === "object") {
		state = data as DebateState;
	}
}

export type { DebateParticipant };
