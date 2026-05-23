/**
 * Pre-spawn validation for harness subagent tool calls.
 */

import {
	type AgentConfig,
	agentAllowsMutatingTools,
} from "../../../vendor/pi-subagents/src/agents.js";
import {
	type HarnessPhase,
	inferHarnessPhase,
} from "../../lib/harness-run-context.js";
import { validateHarnessSpawnTopology } from "./harness-spawn-topology.js";
import { classifyHarnessAgent } from "./harness-subagent-policy.js";

export interface SubagentTaskRef {
	agent: string;
}

export interface PrecheckResult {
	ok: boolean;
	message?: string;
}

export interface PrecheckOptions {
	projectRoot?: string;
	runId?: string | null;
}

function collectAgents(params: {
	agent?: string;
	tasks?: SubagentTaskRef[];
	chain?: SubagentTaskRef[];
	aggregator?: { agent: string };
}): string[] {
	const names: string[] = [];
	if (params.agent) names.push(params.agent);
	if (params.tasks) for (const t of params.tasks) names.push(t.agent);
	if (params.chain) for (const c of params.chain) names.push(c.agent);
	if (params.aggregator) names.push(params.aggregator.agent);
	return names;
}

function resolveAgent(
	agents: AgentConfig[],
	name: string,
): AgentConfig | undefined {
	return agents.find((a) => a.name === name);
}

export async function precheckHarnessSubagentSpawn(
	params: {
		agent?: string;
		tasks?: SubagentTaskRef[];
		chain?: SubagentTaskRef[];
		aggregator?: { agent: string };
	},
	agents: AgentConfig[],
	phase: HarnessPhase,
	opts?: PrecheckOptions,
): Promise<PrecheckResult> {
	const names = collectAgents(params);
	const mutating = names.filter((n) => {
		const cfg = resolveAgent(agents, n);
		return cfg
			? agentAllowsMutatingTools(cfg)
			: n.startsWith("harness/executor");
	});

	if (phase === "plan" && mutating.length > 0) {
		return {
			ok: false,
			message:
				`Plan phase: cannot spawn mutating subagents (${mutating.join(", ")}). ` +
				`Use read-only harness/planning/* agents until execute phase.`,
		};
	}

	const parallelEvalAdversary =
		(params.tasks?.length ?? 0) === 2 &&
		params.tasks?.some((t) => t.agent === "harness/evaluator") &&
		params.tasks?.some((t) => t.agent === "harness/adversary") &&
		phase === "evaluate";

	if (
		(params.tasks?.length ?? 0) > 1 &&
		mutating.length > 1 &&
		!parallelEvalAdversary
	) {
		return {
			ok: false,
			message:
				"Parallel subagent tasks cannot include multiple mutating agents (file race risk). " +
				"Run one executor at a time.",
		};
	}

	const parallelTaskCount = params.tasks?.length ?? (params.agent ? 1 : 0);
	const topology = await validateHarnessSpawnTopology(names, phase, {
		parallelTaskCount,
		projectRoot: opts?.projectRoot,
		runId: opts?.runId,
	});
	if (!topology.ok) {
		return topology;
	}

	for (const name of names) {
		if (!name.startsWith("harness/")) continue;
		classifyHarnessAgent(name);
	}

	return { ok: true };
}

export function inferPhaseForPrecheck(
	entries: unknown[],
	prompt?: string,
): HarnessPhase {
	return inferHarnessPhase(entries as never, prompt);
}
