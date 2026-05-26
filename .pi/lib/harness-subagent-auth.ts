/**
 * Resolve concrete LLM credentials for harness subagent subprocesses.
 *
 * Harness subprocesses run with `--no-extensions`, so auth forwarding only uses
 * concrete provider/model references from env, agent config, or parent session.
 */

import type { AgentConfig } from "../../vendor/pi-subagents/src/agents.js";

const SENTINEL_API_KEYS = new Set(["<authenticated>"]);

export function isUsableApiKey(key: string | undefined): key is string {
	return Boolean(key && !SENTINEL_API_KEYS.has(key));
}

export function parseModelRef(
	ref: string,
): { provider: string; modelId: string } | null {
	const slash = ref.indexOf("/");
	if (slash <= 0) return null;
	const provider = ref.slice(0, slash).trim();
	const modelId = ref.slice(slash + 1).trim();
	if (!provider || !modelId || provider === "router") return null;
	return { provider, modelId };
}

export interface ConcreteSubagentModel {
	modelRef: string;
	provider: string;
	modelId: string;
}

function toConcrete(ref: string): ConcreteSubagentModel | undefined {
	const parsed = parseModelRef(ref);
	if (!parsed) return undefined;
	return { modelRef: ref, ...parsed };
}

const WEB_FAST_AGENT_IDS = new Set([
	"harness/web-retrieval/web-query-expander-fast",
	"harness/web-retrieval/web-summarizer",
	"harness/web-retrieval/web-gap-analyzer",
]);

const WEB_QUALITY_AGENT_IDS = new Set([
	"harness/web-retrieval/web-answerer",
	"harness/web-retrieval/web-criteria-verifier",
]);

function envModelRef(varName: string): string | undefined {
	const v = process.env[varName]?.trim();
	return v && parseModelRef(v) ? v : undefined;
}

function modelFromEnv(agentName: string): ConcreteSubagentModel | undefined {
	const fast = envModelRef("HARNESS_WEB_FAST_MODEL");
	if (fast && WEB_FAST_AGENT_IDS.has(agentName)) return toConcrete(fast);
	const expander = envModelRef("HARNESS_WEB_EXPANDER_MODEL");
	if (expander && agentName === "harness/web-retrieval/web-query-expander") return toConcrete(expander);
	const quality = envModelRef("HARNESS_WEB_QUALITY_MODEL");
	if (quality && WEB_QUALITY_AGENT_IDS.has(agentName)) return toConcrete(quality);
	return undefined;
}

export function resolveConcreteSubagentModel(
	_parentCwd: string,
	parentModel: { provider: string; id: string } | undefined,
	agent: AgentConfig,
	_taskSnippet?: string,
): ConcreteSubagentModel | undefined {
	const envOverride = modelFromEnv(agent.name);
	if (envOverride) return envOverride;

	if (agent.model) {
		const concrete = toConcrete(agent.model);
		if (concrete) return concrete;
	}

	if (!parentModel || parentModel.provider === "router") return undefined;
	return toConcrete(`${parentModel.provider}/${parentModel.id}`);
}
