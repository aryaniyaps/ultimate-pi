/**
 * Resolve concrete LLM credentials for harness subagent subprocesses.
 *
 * Harness subprocesses run with `--no-extensions`, so auth forwarding only uses
 * concrete provider/model references from the parent session or agent config.
 */

import type { AgentConfig } from "../../../vendor/pi-subagents/src/agents.js";

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

export function resolveConcreteSubagentModel(
	_parentCwd: string,
	parentModel: { provider: string; id: string } | undefined,
	agent: AgentConfig,
	_taskSnippet?: string,
): ConcreteSubagentModel | undefined {
	if (agent.model) {
		const parsed = parseModelRef(agent.model);
		if (parsed) {
			return { modelRef: agent.model, ...parsed };
		}
	}

	if (!parentModel || parentModel.provider === "router") return undefined;
	const modelRef = `${parentModel.provider}/${parentModel.id}`;
	const parsed = parseModelRef(modelRef);
	if (!parsed) return undefined;
	return { modelRef, ...parsed };
}
