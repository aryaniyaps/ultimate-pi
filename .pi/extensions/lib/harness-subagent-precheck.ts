/**
 * Pre-spawn validation for harness subagent tool calls.
 */

import {
	type AgentConfig,
	agentAllowsMutatingTools,
} from "../../../vendor/pi-subagents/src/agents.js";
import type { HarnessPhase } from "../../lib/harness-run-context.js";
import { inferHarnessPhase } from "../../lib/harness-run-context.js";
import { classifyHarnessAgent } from "./harness-subagent-policy.js";

export interface SubagentTaskRef {
	agent: string;
}

export interface PrecheckResult {
	ok: boolean;
	message?: string;
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

export function precheckHarnessSubagentSpawn(
	params: {
		agent?: string;
		tasks?: SubagentTaskRef[];
		chain?: SubagentTaskRef[];
		aggregator?: { agent: string };
	},
	agents: AgentConfig[],
	phase: HarnessPhase,
): PrecheckResult {
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

	if ((params.tasks?.length ?? 0) > 1 && mutating.length > 1) {
		return {
			ok: false,
			message:
				"Parallel subagent tasks cannot include multiple mutating agents (file race risk). " +
				"Run one executor at a time.",
		};
	}

	for (const name of names) {
		if (!name.startsWith("harness/")) continue;
		const kind = classifyHarnessAgent(name);
		if (kind === "planner" && phase !== "plan") {
			// allowed — planning agents can run in plan only ideally
		}
	}

	return { ok: true };
}

export function inferPhaseForPrecheck(
	entries: unknown[],
	prompt?: string,
): HarnessPhase {
	return inferHarnessPhase(entries as never, prompt);
}
