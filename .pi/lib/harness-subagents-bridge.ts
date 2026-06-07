/**
 * ultimate-pi harness wrapper around vendored pi-subagents.
 */

import { join } from "node:path";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type { AgentConfig } from "../../vendor/pi-subagents/src/agents.js";
import {
	createSubagentsExtension,
	type HarnessSubagentsOptions,
	type SpawnAuthForward,
} from "../../vendor/pi-subagents/src/subagents.js";
import { getAgentKind, resolveExtensionBundlePaths } from "./agents-policy.mjs";
import {
	delegationEnvFromBundle,
	mintSubagentDelegation,
} from "./agt/delegation.js";
import { spawnCircuitOpen } from "./agt/sre-hooks.js";
import { refreshHarnessCocoindexIndex } from "./harness-cocoindex-refresh.js";
import {
	incrementHarnessPhaseSubagentCount,
	recordHarnessPhaseStart,
} from "./harness-phase-telemetry.js";
import { isHarnessPhaseWorkerEnabled } from "./harness-phase-worker.js";
import { captureHarnessEvent } from "./harness-posthog.js";
import {
	getLatestRunContext,
	getRunIdFromSession,
	type HarnessPhase,
} from "./harness-run-context.js";
import {
	checkHarnessSpawnBudget,
	countHarnessAgentsInRequest,
	createSpawnBudgetState,
	recordSpawnEnd,
	recordSpawnStart,
} from "./harness-spawn-budget.js";
import { parseSpawnContextFromTask } from "./harness-spawn-parse.js";
import { recordDuplicateSpawnBlock } from "./harness-spawn-stall-detector.js";
import {
	isUsableApiKey,
	resolveConcreteSubagentModel,
} from "./harness-subagent-auth.js";
import {
	inferPhaseForPrecheck,
	precheckHarnessSubagentSpawn,
} from "./harness-subagent-precheck.js";
import {
	clearHarnessSubagentProgress,
	setHarnessSubagentProgress,
	startHarnessSubagentHeartbeat,
	stopHarnessSubagentHeartbeat,
} from "./harness-subagent-progress.js";
import { resolveHarnessSubagentTimeoutForAgents } from "./harness-subagent-timeout.js";
import {
	getRememberedSessionWebArtifactDir,
	resolveWebArtifactScope,
} from "./harness-web/artifacts.js";

const spawnBudget = createSpawnBudgetState();
let lastSessionId = "harness";
let spawnGroupCounter = 0;
type PendingSpawnTelemetry = {
	harness_run_id: string;
	run_id: string;
	harness_plan_id: string;
	harness_phase: HarnessPhase;
	agent_ids: string[];
	spawn_group_id: string;
};
let pendingSpawnTelemetry: PendingSpawnTelemetry | null = null;
let bridgePi: ExtensionAPI | null = null;
let executeIndexRefreshPending = true;

function subagentGovernanceExtensionPath(packageRoot: string): string {
	return join(packageRoot, ".pi", "extensions", "subagent-governance.ts");
}

function collectHarnessAgentIds(params: Record<string, unknown>): string[] {
	const out = new Set<string>();
	const maybe = params as {
		agent?: string;
		chain?: Array<{ agent?: string }>;
		tasks?: Array<{ agent?: string }>;
		aggregator?: { agent?: string };
	};
	if (typeof maybe.agent === "string" && maybe.agent.startsWith("harness/")) {
		out.add(maybe.agent);
	}
	for (const item of maybe.chain ?? []) {
		if (typeof item?.agent === "string" && item.agent.startsWith("harness/")) {
			out.add(item.agent);
		}
	}
	for (const item of maybe.tasks ?? []) {
		if (typeof item?.agent === "string" && item.agent.startsWith("harness/")) {
			out.add(item.agent);
		}
	}
	if (
		typeof maybe.aggregator?.agent === "string" &&
		maybe.aggregator.agent.startsWith("harness/")
	) {
		out.add(maybe.aggregator.agent);
	}
	return Array.from(out.values()).sort();
}

function nextSpawnGroupId(sessionId: string): string {
	spawnGroupCounter += 1;
	return `${sessionId}-${Date.now()}-${spawnGroupCounter}`;
}

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
	const governanceExtPath = subagentGovernanceExtensionPath(packageRoot);
	const options: HarnessSubagentsOptions = {
		packageRoot,
		subprocessGovernanceExtensionPath: governanceExtPath,
		harnessSubprocessExtensionPath: governanceExtPath,
		resolveExtensionBundlePaths: (bundleName) =>
			resolveExtensionBundlePaths(packageRoot, bundleName),
		resolveSubprocessEnv: (task, agent) => {
			const projectRoot = process.cwd();
			const base: Record<string, string> = {
				PI_HARNESS_SUBPROCESS: "1",
				HARNESS_AGENT_ID: agent.name,
				HARNESS_PKG_ROOT: packageRoot,
				HARNESS_PROJECT_ROOT: projectRoot,
			};
			if (isHarnessPhaseWorkerEnabled()) {
				base.HARNESS_PHASE_WORKER = "1";
			}
			if (agent.name.startsWith("harness/web-retrieval/")) {
				const ctx = parseSpawnContextFromTask(task);
				const remembered = getRememberedSessionWebArtifactDir(lastSessionId);
				if (remembered) {
					base.HARNESS_WEB_ARTIFACT_DIR = remembered;
				} else if (ctx?.run_id) {
					base.HARNESS_WEB_ARTIFACT_DIR = resolveWebArtifactScope({
						projectRoot,
						explicitArtifactDir: `.web/runs/${ctx.run_id}`,
					}).artifactDir;
				} else {
					base.HARNESS_WEB_ARTIFACT_DIR = resolveWebArtifactScope({
						projectRoot,
						piSessionId: lastSessionId,
					}).artifactDir;
				}
			}
			const ctx = parseSpawnContextFromTask(task);
			if (!ctx?.run_id) return base;
			if (spawnCircuitOpen(ctx.run_id)) {
				return undefined;
			}
			const runDir =
				ctx.run_dir ?? join(packageRoot, ".pi", "harness", "runs", ctx.run_id);
			const kind = getAgentKind(packageRoot, projectRoot, agent.name);
			let delegationEnv: Record<string, string> = {};
			try {
				const bundle = mintSubagentDelegation({
					runId: ctx.run_id,
					runDir,
					agentId: agent.name,
					agentKind: kind,
				});
				delegationEnv = delegationEnvFromBundle(bundle);
			} catch {
				/* identity mint best-effort */
			}
			return {
				...base,
				HARNESS_RUN_ID: ctx.run_id,
				HARNESS_RUN_DIR: runDir,
				HARNESS_SUBAGENT_PHASE_HINT:
					kind === "executor"
						? "execute"
						: kind === "evaluator"
							? "evaluate"
							: kind === "adversary"
								? "adversary"
								: "plan",
				...delegationEnv,
			};
		},
		defaultAgentScope: "both",
		defaultConfirmProjectAgents: false,
		truncateDetails: true,
		resolveSpawnAuth: resolveHarnessSpawnAuth,
		resolveDefaultTimeoutMs: (params, _agents, ctx) => {
			const agentIds = collectHarnessAgentIds(params);
			if (agentIds.length === 0) return undefined;
			const phase = inferPhaseForPrecheck(ctx.sessionManager.getEntries());
			return resolveHarnessSubagentTimeoutForAgents(phase, agentIds);
		},
		beforeExecute: async (params, agents, ctx) => {
			lastSessionId = ctx.sessionManager.getSessionId();
			const { harnessCount } = countHarnessAgentsInRequest(
				params as Parameters<typeof countHarnessAgentsInRequest>[0],
			);
			pendingSpawnTelemetry = null;
			if (harnessCount > 0) {
				const entries = ctx.sessionManager.getEntries();
				const phase = inferPhaseForPrecheck(entries);
				const budget = checkHarnessSpawnBudget(
					spawnBudget,
					harnessCount,
					phase,
				);
				if (!budget.ok) {
					return { ok: false, message: budget.message };
				}
				const runCtx = getLatestRunContext(entries);
				const pre = await precheckHarnessSubagentSpawn(
					params as Parameters<typeof precheckHarnessSubagentSpawn>[0],
					agents,
					phase,
					{
						projectRoot: ctx.cwd,
						runId: runCtx?.run_id ?? null,
						entries,
						taskSummary: runCtx?.task_summary ?? undefined,
						lastOutcome: runCtx?.last_outcome ?? undefined,
					},
				);
				if (!pre.ok) {
					if (pre.message?.includes("Duplicate spawn blocked")) {
						await recordDuplicateSpawnBlock({
							message: pre.message,
							projectRoot: ctx.cwd,
							runId: runCtx?.run_id ?? null,
							phase,
							sessionId: lastSessionId,
						});
					}
					return { ok: false, message: pre.message };
				}
				if (phase === "plan" || phase === "execute") {
					const forceExecuteRefresh =
						phase === "execute" && executeIndexRefreshPending;
					if (forceExecuteRefresh) {
						executeIndexRefreshPending = false;
					}
					const refreshMsg = refreshHarnessCocoindexIndex(ctx.cwd, {
						forceExecuteRefresh,
					});
					if (refreshMsg?.includes("continuing")) {
						// warn-only path; do not block spawn
					} else if (refreshMsg) {
						return { ok: false, message: refreshMsg };
					}
				}
				const runId =
					runCtx?.run_id ??
					getRunIdFromSession(entries, lastSessionId) ??
					lastSessionId;
				pendingSpawnTelemetry = {
					harness_run_id: runId,
					run_id: runId,
					harness_plan_id: runCtx?.plan_id ?? "plan-unknown",
					harness_phase: phase,
					agent_ids: collectHarnessAgentIds(params as Record<string, unknown>),
					spawn_group_id: nextSpawnGroupId(lastSessionId),
				};
			}
			return { ok: true };
		},
		onSpawnStart: (harnessCount) => {
			if (harnessCount <= 0) return;
			recordSpawnStart(spawnBudget, harnessCount);
			const phase = pendingSpawnTelemetry?.harness_phase ?? "plan";
			const runId = pendingSpawnTelemetry?.run_id ?? lastSessionId;
			const agentIds = pendingSpawnTelemetry?.agent_ids ?? [];
			recordHarnessPhaseStart(runId, phase);
			incrementHarnessPhaseSubagentCount(runId, phase, harnessCount);
			setHarnessSubagentProgress({
				agentIds,
				phase,
			});
			captureHarnessEvent(lastSessionId, "harness_subagent_setup", {
				harness_run_id: runId,
				run_id: runId,
				harness_phase: phase,
				agent_ids: agentIds,
				agent_count: agentIds.length,
			});
			startHarnessSubagentHeartbeat(() => {
				bridgePi?.events.emit("harness-progress:updated", {});
			});
			captureHarnessEvent(lastSessionId, "harness_subagent_spawned", {
				active_after: spawnBudget.active,
				spawn_count: harnessCount,
				harness_run_id: pendingSpawnTelemetry?.harness_run_id ?? lastSessionId,
				run_id: pendingSpawnTelemetry?.run_id ?? lastSessionId,
				harness_plan_id:
					pendingSpawnTelemetry?.harness_plan_id ?? "plan-unknown",
				harness_phase: pendingSpawnTelemetry?.harness_phase ?? "plan",
				agent_ids: pendingSpawnTelemetry?.agent_ids ?? [],
				agent_count: pendingSpawnTelemetry?.agent_ids.length ?? harnessCount,
				spawn_group_id:
					pendingSpawnTelemetry?.spawn_group_id ??
					nextSpawnGroupId(lastSessionId),
			});
		},
		onSpawnEnd: (harnessCount) => {
			if (harnessCount <= 0) return;
			recordSpawnEnd(spawnBudget, harnessCount);
		},
		onCompleted: ({ agents, mode, durationMs, timedOut, stop_reason }) => {
			stopHarnessSubagentHeartbeat();
			clearHarnessSubagentProgress();
			bridgePi?.events.emit("harness-progress:updated", {});

			if (agents.length === 0) return;
			const runId = pendingSpawnTelemetry?.run_id ?? lastSessionId;
			const phase = pendingSpawnTelemetry?.harness_phase ?? "plan";
			const base = {
				mode,
				duration_ms: durationMs,
				agent_count: agents.length,
				agent_ids: agents,
				harness_run_id: pendingSpawnTelemetry?.harness_run_id ?? lastSessionId,
				run_id: runId,
				harness_plan_id:
					pendingSpawnTelemetry?.harness_plan_id ?? "plan-unknown",
				harness_phase: phase,
				spawn_group_id:
					pendingSpawnTelemetry?.spawn_group_id ??
					nextSpawnGroupId(lastSessionId),
				stop_reason: stop_reason ?? (timedOut ? "timeout" : "complete"),
			};
			captureHarnessEvent(lastSessionId, "harness_subagent_result_wait", {
				...base,
				wait_ms: durationMs,
			});
			if (timedOut) {
				captureHarnessEvent(lastSessionId, "harness_subagent_timeout", {
					...base,
					incomplete_artifact_paths: agents.map((a) => `subagent:${a}:timeout`),
					escalation: "human_required",
				});
			}
			captureHarnessEvent(lastSessionId, "harness_subagent_completed", base);
			pendingSpawnTelemetry = null;
		},
	};

	return (pi: ExtensionAPI) => {
		bridgePi = pi;
		createSubagentsExtension(pi, options);
		pi.events.on("harness-run-context:updated", () => {
			executeIndexRefreshPending = true;
		});
	};
}
