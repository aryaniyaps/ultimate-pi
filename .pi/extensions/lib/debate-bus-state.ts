/**
 * Shared in-process debate bus state (one session per Pi process).
 */

import type { DebateParticipant } from "../../lib/debate-orchestrator-types.js";

export type DebatePhase = "plan" | "post_execute";

export interface DebateState {
	run_id: string;
	debate_id: string;
	debate_phase: DebatePhase;
	round_count: number;
	budget_used: number;
	max_rounds: number;
	round_token_cap: number;
	debate_global_cap: number;
	last_review_gate_ready?: boolean;
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
