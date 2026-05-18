/**
 * ultimate-pi harness wrapper around vendored pi-subagents.
 */

import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type { AgentConfig } from "../../../vendor/pi-subagents/src/agents.js";
import {
	createSubagentsExtension,
	type HarnessSubagentsOptions,
	type SpawnAuthForward,
} from "../../../vendor/pi-subagents/src/subagents.js";
import { captureHarnessEvent } from "./harness-posthog.js";
import {
	checkHarnessSpawnBudget,
	countHarnessAgentsInRequest,
	createSpawnBudgetState,
	recordSpawnEnd,
	recordSpawnStart,
} from "./harness-spawn-budget.js";
import {
	isUsableApiKey,
	resolveConcreteSubagentModel,
} from "./harness-subagent-auth.js";
import {
	inferPhaseForPrecheck,
	precheckHarnessSubagentSpawn,
} from "./harness-subagent-precheck.js";

const spawnBudget = createSpawnBudgetState();
let lastSessionId = "harness";

function maskApiKey(key: string | undefined): string | undefined {
	if (!key) return undefined;
	if (key.length <= 12) return "***";
	return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

// #region agent log
function agentDebugLog(
	hypothesisId: string,
	location: string,
	message: string,
	data: Record<string, unknown>,
): void {
	fetch("http://127.0.0.1:7928/ingest/a5d40896-34cb-4f12-97db-df7ada0b22f0", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Debug-Session-Id": "e762d5",
		},
		body: JSON.stringify({
			sessionId: "e762d5",
			hypothesisId,
			location,
			message,
			data,
			timestamp: Date.now(),
		}),
	}).catch(() => {});
}
// #endregion

async function resolveHarnessSpawnAuth(
	ctx: ExtensionContext,
	agent: AgentConfig,
): Promise<SpawnAuthForward | undefined> {
	const parentModel = ctx.model
		? { provider: ctx.model.provider, id: ctx.model.id }
		: undefined;
	const concrete = resolveConcreteSubagentModel(ctx.cwd, parentModel, agent);
	if (!concrete) {
		// #region agent log
		agentDebugLog(
			"D",
			"harness-subagents-bridge.ts:resolveHarnessSpawnAuth",
			"no concrete model",
			{
				agent: agent.name,
				agentModel: agent.model,
				parentModel: parentModel
					? `${parentModel.provider}/${parentModel.id}`
					: undefined,
			},
		);
		// #endregion
		return undefined;
	}
	const apiKey = await ctx.modelRegistry.getApiKeyForProvider(
		concrete.provider,
	);
	// #region agent log
	agentDebugLog(
		"F",
		"harness-subagents-bridge.ts:resolveHarnessSpawnAuth",
		"concrete subprocess auth",
		{
			agent: agent.name,
			parentModel: parentModel
				? `${parentModel.provider}/${parentModel.id}`
				: undefined,
			concreteModel: concrete.modelRef,
			routerProfile: concrete.routerProfile,
			routerTier: concrete.routerTier,
			apiKey: maskApiKey(apiKey),
			usable: isUsableApiKey(apiKey),
		},
	);
	// #endregion
	if (!isUsableApiKey(apiKey)) return undefined;
	return {
		provider: concrete.provider,
		modelRef: concrete.modelRef,
		apiKey,
	};
}

export function createHarnessSubagentsExtension(
	packageRoot: string,
): (pi: ExtensionAPI) => void {
	const options: HarnessSubagentsOptions = {
		packageRoot,
		defaultAgentScope: "both",
		defaultConfirmProjectAgents: false,
		truncateDetails: true,
		resolveSpawnAuth: resolveHarnessSpawnAuth,
		beforeExecute: async (params, agents, ctx) => {
			lastSessionId = ctx.sessionManager.getSessionId();
			const { harnessCount } = countHarnessAgentsInRequest(
				params as Parameters<typeof countHarnessAgentsInRequest>[0],
			);
			if (harnessCount > 0) {
				const budget = checkHarnessSpawnBudget(spawnBudget, harnessCount);
				if (!budget.ok) {
					return { ok: false, message: budget.message };
				}
				const phase = inferPhaseForPrecheck(ctx.sessionManager.getEntries());
				const pre = precheckHarnessSubagentSpawn(
					params as Parameters<typeof precheckHarnessSubagentSpawn>[0],
					agents,
					phase,
				);
				if (!pre.ok) {
					return { ok: false, message: pre.message };
				}
			}
			return { ok: true };
		},
		onSpawnStart: (harnessCount) => {
			if (harnessCount <= 0) return;
			recordSpawnStart(spawnBudget, harnessCount);
			captureHarnessEvent(lastSessionId, "harness_subagent_spawned", {
				active_after: spawnBudget.active,
				spawn_count: harnessCount,
			});
		},
		onSpawnEnd: (harnessCount) => {
			if (harnessCount <= 0) return;
			recordSpawnEnd(spawnBudget, harnessCount);
		},
		onCompleted: ({ agents, mode, durationMs }) => {
			if (agents.length === 0) return;
			captureHarnessEvent(lastSessionId, "harness_subagent_completed", {
				mode,
				duration_ms: durationMs,
				agent_count: agents.length,
			});
		},
	};

	return (pi: ExtensionAPI) => {
		createSubagentsExtension(pi, options);
	};
}
