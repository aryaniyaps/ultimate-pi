/**
 * Resolve concrete LLM credentials for harness subagent subprocesses.
 *
 * Parent sessions often use `router/auto` (pi-model-router). Subagents run with
 * `--no-extensions`, so they cannot use the logical router provider — they need
 * a real provider/model plus that provider's API key.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentConfig } from "../../../vendor/pi-subagents/src/agents.js";

const ROUTER_SENTINEL_KEY = "pi-model-router";
const SENTINEL_API_KEYS = new Set([ROUTER_SENTINEL_KEY, "<authenticated>"]);

type RouterTier = "high" | "medium" | "low";

interface ModelRouterJson {
	defaultProfile?: string;
	profiles?: Record<string, Partial<Record<RouterTier, { model?: string }>>>;
}

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
	if (!provider || !modelId) return null;
	return { provider, modelId };
}

export function thinkingToRouterTier(thinking?: string): RouterTier {
	if (thinking === "high" || thinking === "xhigh") return "high";
	if (thinking === "off" || thinking === "minimal" || thinking === "low") {
		return "low";
	}
	return "medium";
}

/** Map router profile tier → concrete `provider/model` from `.pi/model-router.json`. */
export function resolveRouterConcreteModelRef(
	cwd: string,
	profileId: string,
	tier: RouterTier,
): string | undefined {
	const path = join(cwd, ".pi", "model-router.json");
	if (!existsSync(path)) return undefined;
	let raw: ModelRouterJson;
	try {
		raw = JSON.parse(readFileSync(path, "utf8")) as ModelRouterJson;
	} catch {
		return undefined;
	}
	const profiles = raw.profiles;
	if (!profiles) return undefined;
	const profile =
		profiles[profileId] ??
		profiles[raw.defaultProfile ?? "auto"] ??
		profiles.auto;
	const model = profile?.[tier]?.model;
	return typeof model === "string" && model.includes("/") ? model : undefined;
}

export interface ConcreteSubagentModel {
	modelRef: string;
	provider: string;
	modelId: string;
	routerProfile?: string;
	routerTier?: RouterTier;
}

/**
 * Pick the subprocess model ref before resolving API keys.
 * Never returns `router/*` — always a concrete provider.
 */
export function resolveConcreteSubagentModel(
	cwd: string,
	parentModel: { provider: string; id: string } | undefined,
	agent: AgentConfig,
): ConcreteSubagentModel | undefined {
	if (agent.model && !agent.model.startsWith("router/")) {
		const parsed = parseModelRef(agent.model);
		if (parsed) {
			return { modelRef: agent.model, ...parsed };
		}
	}

	const parentIsRouter = parentModel?.provider === "router";
	const agentIsRouter = Boolean(agent.model?.startsWith("router/"));

	if (!parentIsRouter && !agentIsRouter) {
		if (parentModel && parentModel.provider !== "router") {
			return {
				modelRef: `${parentModel.provider}/${parentModel.id}`,
				provider: parentModel.provider,
				modelId: parentModel.id,
			};
		}
		return undefined;
	}

	const profileId =
		agentIsRouter && agent.model
			? agent.model.slice("router/".length)
			: (parentModel?.id ?? "auto");
	const tier = thinkingToRouterTier(agent.thinking);
	const concrete = resolveRouterConcreteModelRef(cwd, profileId, tier);
	if (!concrete) return undefined;
	const parsed = parseModelRef(concrete);
	if (!parsed || parsed.provider === "router") return undefined;
	return {
		modelRef: concrete,
		...parsed,
		routerProfile: profileId,
		routerTier: tier,
	};
}
