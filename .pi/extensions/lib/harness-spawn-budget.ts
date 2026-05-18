/**
 * Harness subagent spawn caps (subprocess model).
 */

export const HARNESS_MAX_ACTIVE_SUBAGENTS = 8;
export const HARNESS_MAX_SUBAGENT_SPAWNS_PER_SESSION = 12;

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
): { ok: boolean; message?: string } {
	if (state.active + incomingHarnessTasks > HARNESS_MAX_ACTIVE_SUBAGENTS) {
		return {
			ok: false,
			message:
				`Harness subagent limit reached (${state.active} active + ${incomingHarnessTasks} requested > ${HARNESS_MAX_ACTIVE_SUBAGENTS}). ` +
				`Wait for in-flight subagent calls to finish before spawning more.`,
		};
	}
	if (
		state.totalHarnessSpawns + incomingHarnessTasks >
		HARNESS_MAX_SUBAGENT_SPAWNS_PER_SESSION
	) {
		return {
			ok: false,
			message:
				`Harness subagent spawn cap reached (${state.totalHarnessSpawns + incomingHarnessTasks}/${HARNESS_MAX_SUBAGENT_SPAWNS_PER_SESSION} this session). ` +
				`Finish the current harness phase or start a new session.`,
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
