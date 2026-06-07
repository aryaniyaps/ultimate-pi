/**
 * Harness subagent spawn accounting (subprocess model).
 * When HARNESS_BUDGET_ENFORCE=1, per-phase spawn caps apply.
 */

import { isHarnessBudgetEnforceOn } from "./harness-budget-enforce.js";
import type { HarnessPhase } from "./harness-run-context.js";

const PHASE_SPAWN_CAPS: Record<HarnessPhase, number> = {
	plan: 12,
	execute: 3,
	evaluate: 6,
	adversary: 4,
	merge: 2,
};

export function phaseSpawnCap(phase: HarnessPhase): number {
	return PHASE_SPAWN_CAPS[phase];
}

export function isHarnessAgentType(type: string): boolean {
	return type.startsWith("harness/");
}

export interface SpawnBudgetState {
	active: number;
	totalHarnessSpawns: number;
}

export function createSpawnBudgetState(): SpawnBudgetState {
	return { active: 0, totalHarnessSpawns: 0 };
}

export function countHarnessAgentsInRequest(params: {
	agent?: string;
	tasks?: { agent: string }[];
	chain?: { agent: string }[];
	aggregator?: { agent: string };
}): { harnessCount: number; agents: string[] } {
	const agents: string[] = [];
	if (params.agent) agents.push(params.agent);
	if (params.tasks) for (const t of params.tasks) agents.push(t.agent);
	if (params.chain) for (const c of params.chain) agents.push(c.agent);
	if (params.aggregator) agents.push(params.aggregator.agent);
	const harness = agents.filter(isHarnessAgentType);
	return { harnessCount: harness.length, agents: harness };
}

export function checkHarnessSpawnBudget(
	state: SpawnBudgetState,
	incomingHarnessTasks: number,
	phase?: HarnessPhase,
): { ok: boolean; message?: string } {
	if (!isHarnessBudgetEnforceOn() || !phase) {
		return { ok: true };
	}
	const cap = PHASE_SPAWN_CAPS[phase];
	const projected = state.totalHarnessSpawns + incomingHarnessTasks;
	if (projected > cap) {
		return {
			ok: false,
			message:
				`Spawn budget exceeded for ${phase} phase (${projected}/${cap}). ` +
				`Use harness_plan_next_action or reduce spawns; set HARNESS_BUDGET_ENFORCE=0 to disable.`,
		};
	}
	return { ok: true };
}

export function recordSpawnStart(
	state: SpawnBudgetState,
	harnessCount: number,
): void {
	state.active += harnessCount;
	state.totalHarnessSpawns += harnessCount;
}

export function recordSpawnEnd(
	state: SpawnBudgetState,
	harnessCount: number,
): void {
	state.active = Math.max(0, state.active - harnessCount);
}
