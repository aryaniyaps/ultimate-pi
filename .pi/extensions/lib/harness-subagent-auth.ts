/**
 * Resolve concrete LLM credentials for harness subagent subprocesses.
 *
 * Parent sessions often use `router/<profile>` (pi-model-router). Subagents run with
 * `--no-extensions`, so they cannot use the logical router provider — they need
 * a real provider/model plus that provider's API key.
 *
 * Session-locked routing: subprocess model is chosen once from agent system prompt
 * complexity (same analysis as parent session lock), not from per-turn parent tier.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveTierFromPrompt } from "../../../vendor/pi-model-router/extensions/routing.js";
import type {
	RouterProfile,
	RouterTier,
	RoutingRule,
} from "../../../vendor/pi-model-router/extensions/types.js";
import type { AgentConfig } from "../../../vendor/pi-subagents/src/agents.js";

const ROUTER_SENTINEL_KEY = "pi-model-router";
const SENTINEL_API_KEYS = new Set([ROUTER_SENTINEL_KEY, "<authenticated>"]);

interface ModelRouterJson {
	defaultProfile?: string;
	phaseBias?: number;
	rules?: RoutingRule[];
	profiles?: Record<string, RouterProfile>;
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

/** Planning subagents that should prefer low/medium router tier for latency. */
const ROUTINE_PLANNING_AGENT_PATHS = new Set([
	"harness/planning/plan-evaluator",
	"harness/planning/plan-adversary",
	"harness/planning/review-integrator",
	"harness/planning/hypothesis-validator",
	"harness/planning/sprint-contract-auditor",
	"harness/planning/scout-structure",
	"harness/planning/scout-semantic",
	"harness/planning/decompose",
	"harness/planning/hypothesis",
	"harness/planning/stack-research",
	"harness/planning/plan-validator",
]);

export function isRoutinePlanningAgent(agentName: string): boolean {
	return ROUTINE_PLANNING_AGENT_PATHS.has(agentName);
}

export function thinkingToRouterTier(
	thinking?: string,
	agentName?: string,
): RouterTier {
	if (agentName && isRoutinePlanningAgent(agentName)) {
		if (thinking === "high" || thinking === "xhigh") return "medium";
		return "low";
	}
	if (thinking === "high" || thinking === "xhigh") return "high";
	if (thinking === "off" || thinking === "minimal" || thinking === "low") {
		return "low";
	}
	return "medium";
}

function loadModelRouterConfig(cwd: string): ModelRouterJson | undefined {
	const path = join(cwd, ".pi", "model-router.json");
	if (!existsSync(path)) return undefined;
	try {
		return JSON.parse(readFileSync(path, "utf8")) as ModelRouterJson;
	} catch {
		return undefined;
	}
}

function resolveRouterProfileEntry(
	config: ModelRouterJson,
	profileId: string,
): { profileId: string; profile: RouterProfile } | undefined {
	const profiles = config.profiles;
	if (!profiles) return undefined;
	const candidates = [
		profileId,
		config.defaultProfile ?? "auto",
		"auto",
		"opencode-go",
	];
	const seen = new Set<string>();
	for (const id of candidates) {
		if (!id || seen.has(id)) continue;
		seen.add(id);
		const profile = profiles[id];
		if (profile?.high?.model && profile.medium?.model && profile.low?.model) {
			return { profileId: id, profile };
		}
	}
	return undefined;
}

/** Tier from agent system prompt (+ optional task line) for session model lock. */
export function resolveSubagentRouterTier(
	cwd: string,
	profileId: string,
	agent: AgentConfig,
	taskSnippet?: string,
): RouterTier {
	const config = loadModelRouterConfig(cwd);
	if (config) {
		const entry = resolveRouterProfileEntry(config, profileId);
		if (entry) {
			return resolveTierFromPrompt(
				agent.systemPrompt ?? "",
				taskSnippet?.trim() ?? "",
				entry.profileId,
				entry.profile,
				config.rules,
				config.phaseBias ?? 0.5,
			);
		}
	}
	return thinkingToRouterTier(agent.thinking, agent.name);
}

/** Map router profile tier → concrete `provider/model` from `.pi/model-router.json`. */
export function resolveRouterConcreteModelRef(
	cwd: string,
	profileId: string,
	tier: RouterTier,
): string | undefined {
	const path = join(cwd, ".pi", "model-router.json");
	if (!existsSync(path)) return undefined;
	const raw = loadModelRouterConfig(cwd);
	if (!raw) return undefined;
	const entry = resolveRouterProfileEntry(raw, profileId);
	const model = entry?.profile[tier]?.model;
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
	taskSnippet?: string,
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
	const tier = resolveSubagentRouterTier(cwd, profileId, agent, taskSnippet);
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
