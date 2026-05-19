/**
 * ultimate-pi harness wrapper around vendored pi-subagents.
 */

import { join } from "node:path";
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
import { parseSpawnContextFromTask } from "../../lib/harness-spawn-parse.js";
import { harnessSubagentSubmitExtensionPath } from "../harness-subagent-submit.js";
import { refreshHarnessCocoindexIndex } from "./harness-cocoindex-refresh.js";
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

async function resolveHarnessSpawnAuth(
	ctx: ExtensionContext,
	agent: AgentConfig,
): Promise<SpawnAuthForward | undefined> {
	const parentModel = ctx.model
		? { provider: ctx.model.provider, id: ctx.model.id }
		: undefined;
	const concrete = resolveConcreteSubagentModel(ctx.cwd, parentModel, agent);
	if (!concrete) {
		return undefined;
	}
	const apiKey = await ctx.modelRegistry.getApiKeyForProvider(
		concrete.provider,
	);
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
	const submitExtPath = harnessSubagentSubmitExtensionPath(packageRoot);
	const options: HarnessSubagentsOptions = {
		packageRoot,
		harnessSubprocessExtensionPath: submitExtPath,
		resolveSubprocessEnv: (task, agent) => {
			if (!agent.name.startsWith("harness/")) return undefined;
			const ctx = parseSpawnContextFromTask(task);
			// #region agent log
			fetch(
				"http://127.0.0.1:7928/ingest/a5d40896-34cb-4f12-97db-df7ada0b22f0",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Debug-Session-Id": "2ca12b",
					},
					body: JSON.stringify({
						sessionId: "2ca12b",
						hypothesisId: "H1",
						location: "harness-subagents-bridge.ts:resolveSubprocessEnv",
						message: "parsed spawn context for subprocess env",
						data: {
							agent: agent.name,
							hasCtx: Boolean(ctx?.run_id),
							run_id: ctx?.run_id ?? null,
							run_dir: ctx?.run_dir ?? null,
							taskPrefix: task.slice(0, 160),
						},
						timestamp: Date.now(),
					}),
				},
			).catch(() => {});
			// #endregion
			if (!ctx?.run_id) return undefined;
			return {
				HARNESS_RUN_ID: ctx.run_id,
				HARNESS_RUN_DIR:
					ctx.run_dir ??
					join(packageRoot, ".pi", "harness", "runs", ctx.run_id),
			};
		},
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
				if (phase === "plan" || phase === "execute") {
					const refreshMsg = refreshHarnessCocoindexIndex(ctx.cwd);
					if (refreshMsg?.includes("continuing")) {
						// warn-only path; do not block spawn
					} else if (refreshMsg) {
						return { ok: false, message: refreshMsg };
					}
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
