/**
 * Harness subagent spawn accounting (subprocess model).
 * No session caps — parallel batches are limited only by host resources.
 */

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

/** Always allows spawn; state is tracked for telemetry only. */
export function checkHarnessSpawnBudget(
	_state: SpawnBudgetState,
	_incomingHarnessTasks: number,
): { ok: boolean; message?: string } {
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
