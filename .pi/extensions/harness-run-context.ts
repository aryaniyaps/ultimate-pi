/**
 * harness-run-context — session-scoped active run + plan injection.
 *
 * Hook order: runs before trace-recorder (alphabetically h < t). Allocates run_id
 * in before_agent_start so trace-recorder reuses it on agent_start.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import {
	canonicalPlanPath,
	claimRunOwnership,
	createFreshRunContext,
	criticalPathWorkItemIdsFromPlanPacket,
	driftGateActive,
	evaluateCrossSessionResume,
	extractWritePathFromToolInput,
	formatActivePlanBlock,
	formatCrossSessionResumeMessage,
	formatPlanContextBlock,
	getLatestHarnessTurn,
	getLatestPolicyPhase,
	getLatestRunContext,
	getPolicyTransitionBlock,
	type HarnessRunContext,
	type HarnessTurnEntry,
	hasHarnessAbortSignal,
	hasPlanUserApproval,
	inferHarnessPhase,
	isAmendPlanAllowed,
	isHarnessBootstrapPrompt,
	isNewTaskPlanBlocked,
	isPlanApprovalAskUser,
	isPlanPhaseScopedWrite,
	isStaleActiveRunPointer,
	loadProjectActiveRun,
	loadRunContextFromDisk,
	nextStepAfterOutcome,
	normalizeHarnessPath,
	nowIso,
	type PlanPacketSummary,
	parseHarnessSlashInput,
	parseHarnessUseRunArgs,
	parsePlanApprovalFromMessage,
	planPacketSummary,
	readExecutorHandoffFromRun,
	readPlanPacketFromPath,
	readReviewOutcomeFromRun,
	resolveArgsForCommand,
	resolveCompletionStatuses,
	saveProjectActiveRun,
	saveRunContextToDisk,
	sessionHasResumePromptForRun,
	shouldAutoClaimHarnessRun,
	shouldReuseHarnessRunId,
	steerMaxAttemptsFromEnv,
	userVisiblePromptSlice,
	validatePlanOverridePath,
	validatePlanPacket,
} from "../lib/harness-run-context.js";
import {
	normalizeHarnessYamlContent,
	parseStructuredDocument,
	writeYamlFile,
} from "../lib/harness-yaml.js";
import { claimHarnessGovernanceLoad } from "./lib/extension-load-guard.js";
import {
	evaluateHarnessSubagentToolCall,
	isSubmitToolName,
} from "./lib/harness-subagent-policy.js";
import { bootstrapHarnessSubprocessFromEnv } from "./lib/harness-subprocess-bootstrap.js";
import { isReviewRoundArtifactPath } from "./lib/plan-debate-gate.js";
import { isReviewRoundYamlWriteAllowed } from "./lib/plan-debate-write-guard.js";

// @ts-expect-error pi extensions run as ESM
const MODULE_URL = import.meta.url;

interface SessionEntryLike {
	type?: string;
	customType?: string;
	data?: unknown;
}

function getEntries(ctx: {
	sessionManager: { getEntries(): unknown[] };
}): unknown[] {
	return ctx.sessionManager.getEntries();
}

function persistContext(pi: ExtensionAPI, ctx: HarnessRunContext): void {
	pi.appendEntry("harness-run-context", ctx);
	void saveRunContextToDisk(ctx);
	void saveProjectActiveRun(ctx);
	pi.events.emit("harness-run-context:updated", { run_id: ctx.run_id });
}

function syncPolicyFromRunContext(
	pi: ExtensionAPI,
	entries: unknown[],
	runCtx: HarnessRunContext,
): void {
	syncPolicyFromPlan(
		pi,
		entries,
		runCtx.plan_id ?? "plan-unknown",
		runCtx.phase,
		runCtx.plan_ready,
	);
}

function extractTaskSummary(args: string, prompt?: string): string | null {
	const fromArgs = args.match(/"([^"]+)"/);
	if (fromArgs?.[1]) return fromArgs[1];
	if (args.trim()) return args.trim().slice(0, 200);
	if (prompt) {
		const quoted = prompt.match(/"([^"]+)"/);
		if (quoted?.[1]) return quoted[1];
	}
	return null;
}

function appendHarnessTurn(pi: ExtensionAPI, turn: HarnessTurnEntry): void {
	pi.appendEntry("harness-turn", turn);
	pi.appendEntry("harness-plan-attempt", {
		run_id: null,
		command: turn.command,
		started_at: turn.invoked_at,
	});
}

async function coerceScopedHarnessYamlWrite(
	event: { toolName: string; input: Record<string, unknown> },
	runCtx: HarnessRunContext,
	projectRoot: string,
): Promise<{ block: true; reason: string } | undefined> {
	if (event.toolName !== "write") return undefined;
	const target = extractWritePathFromToolInput(event.input);
	if (!target.endsWith(".yaml") && !target.endsWith(".yml")) return undefined;
	const scoped = await isPlanPhaseScopedWrite(target, runCtx, projectRoot);
	if (!scoped) return undefined;
	const content = event.input.content;
	if (typeof content !== "string") return undefined;
	try {
		event.input.content = normalizeHarnessYamlContent(content, target);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return {
			block: true,
			reason:
				`harness-run-context: ${target} must be canonical YAML, not embedded JSON. ` +
				`Use write_harness_yaml with the subagent JSON/YAML block, or paste valid YAML. (${msg})`,
		};
	}
	return undefined;
}

function syncPolicyFromPlan(
	pi: ExtensionAPI,
	entries: unknown[],
	planId: string,
	phase: HarnessRunContext["phase"],
	approvedPlan: boolean,
): void {
	let prior: Record<string, unknown> = {
		phase,
		approvedPlan,
		planId,
		budgetBypass: false,
		aborted: false,
		abortReason: null,
		abortedAt: null,
		updatedAt: nowIso(),
	};
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i] as SessionEntryLike;
		if (entry.type !== "custom" || entry.customType !== "harness-policy-state")
			continue;
		prior = { ...(entry.data as Record<string, unknown>), ...prior };
		break;
	}
	pi.appendEntry("harness-policy-state", prior);
	pi.appendEntry("harness-drift-state", {
		baseline_plan_id: planId,
		drift_score: 0,
		last_report_at: null,
		user_acknowledged: false,
	});
}

function hydrateFromSession(entries: unknown[]): HarnessRunContext | null {
	return getLatestRunContext(entries);
}

async function hydrateFromDisk(
	sessionId: string,
	projectRoot: string,
	entries: unknown[],
): Promise<HarnessRunContext | null> {
	const fromSession = getLatestRunContext(entries);
	if (fromSession) return fromSession;

	const pointer = await loadProjectActiveRun(projectRoot);
	if (!pointer || isStaleActiveRunPointer(pointer, projectRoot)) return null;

	const disk = await loadRunContextFromDisk(pointer.run_id, projectRoot);
	if (disk) return disk;

	return {
		schema_version: "1.0.0",
		run_id: pointer.run_id,
		pi_session_id: sessionId,
		project_root: projectRoot,
		phase: pointer.phase,
		plan_id: pointer.plan_id,
		plan_packet_path: canonicalPlanPath(pointer.run_id, projectRoot),
		plan_ready: pointer.plan_ready,
		task_summary: null,
		status: "active",
		last_completed_step: null,
		last_outcome: null,
		next_recommended_command: null,
		owner_pi_session_id: pointer.owner_pi_session_id,
		updated_at: pointer.updated_at,
	};
}

function needsClarificationFollowUp(ctx: HarnessRunContext | null): boolean {
	return ctx?.status === "active" && ctx.last_outcome === "needs_clarification";
}

async function offerCrossSessionResume(
	pi: ExtensionAPI,
	ctx: {
		hasUI: boolean;
		sessionManager: { getEntries(): unknown[] };
		ui: {
			notify(message: string, type?: "info" | "warning" | "error"): void;
		};
	},
): Promise<void> {
	const projectRoot = process.cwd();
	const entries = getEntries(ctx);
	const info = await evaluateCrossSessionResume(projectRoot, entries);
	if (!info || sessionHasResumePromptForRun(entries, info.runId)) return;

	const content = formatCrossSessionResumeMessage(info);
	pi.appendEntry("harness-session-resume-prompt", {
		run_id: info.runId,
		resume_command: info.resumeCommand,
		shown_at: nowIso(),
	});
	pi.sendMessage({
		customType: "harness-session-resume-prompt",
		content,
		display: true,
	});
	if (ctx.hasUI) {
		ctx.ui.notify(
			`Harness run on disk. Resume with ${info.resumeCommand}`,
			"info",
		);
	}
	pi.events.emit("harness-cross-session-resume", {
		run_id: info.runId,
		resume_command: info.resumeCommand,
	});
}

export default function harnessRunContext(pi: ExtensionAPI) {
	if (!claimHarnessGovernanceLoad("harness-run-context", MODULE_URL)) return;
	let activeCtx: HarnessRunContext | null = null;

	pi.on("session_start", async (_event, ctx) => {
		const entries = getEntries(ctx);
		activeCtx = hydrateFromSession(entries);
		const booted = await bootstrapHarnessSubprocessFromEnv(pi, ctx);
		if (booted) activeCtx = booted;
		if (!booted) await offerCrossSessionResume(pi, ctx);
	});

	pi.on("input", async (event) => {
		if (event.source === "extension") {
			return { action: "continue" as const };
		}
		const parsed = parseHarnessSlashInput(event.text);
		if (!parsed) {
			return { action: "continue" as const };
		}
		appendHarnessTurn(pi, {
			schema_version: "1.0.0",
			command: parsed.command,
			args: parsed.args,
			source: "slash",
			invoked_at: nowIso(),
		});
		return { action: "continue" as const };
	});

	pi.on("before_agent_start", async (event, ctx) => {
		const sessionId = ctx.sessionManager.getSessionId();
		const projectRoot = process.cwd();
		const entries = getEntries(ctx);
		const userPrompt = userVisiblePromptSlice(event.prompt);
		const turn = getLatestHarnessTurn(entries);
		const parsed = turn
			? { command: turn.command, args: turn.args }
			: parseHarnessSlashInput(userPrompt);
		const harnessTurn =
			Boolean(turn) || Boolean(parsed) || needsClarificationFollowUp(activeCtx);

		if (
			userPrompt.toLowerCase().includes("/harness-abort") ||
			userPrompt.toLowerCase().includes("harness-abort")
		) {
			if (!activeCtx) {
				activeCtx = await hydrateFromDisk(sessionId, projectRoot, entries);
			}
			if (activeCtx) {
				activeCtx.status = "aborted";
				activeCtx.plan_ready = false;
				activeCtx.last_outcome = "aborted";
				activeCtx.last_completed_step = "abort";
				activeCtx.next_recommended_command = activeCtx.task_summary
					? `/harness-plan "${activeCtx.task_summary}"`
					: '/harness-plan "<task>"';
				persistContext(pi, activeCtx);
			}
		}

		if (!harnessTurn) {
			return undefined;
		}

		if (!activeCtx) {
			activeCtx = await hydrateFromDisk(sessionId, projectRoot, entries);
		}

		const policyPhase =
			inferHarnessPhase(entries, userPrompt) ??
			getLatestPolicyPhase(entries) ??
			activeCtx?.phase ??
			"plan";
		const driftActive = driftGateActive(entries);

		// Plain-language follow-up after needs_clarification
		if (!parsed && needsClarificationFollowUp(activeCtx) && activeCtx) {
			activeCtx.phase = "plan";
			activeCtx.last_outcome = "needs_clarification";
			const packet = activeCtx.plan_packet_path
				? await readPlanPacketFromPath(activeCtx.plan_packet_path)
				: null;
			const planPath = activeCtx.plan_packet_path;
			const summary =
				packet && planPath
					? planPacketSummary(packet, planPath, "needs_clarification")
					: null;
			syncPolicyFromPlan(
				pi,
				entries,
				activeCtx.plan_id ?? "plan-pending",
				"plan",
				false,
			);
			persistContext(pi, activeCtx);
			return {
				systemPrompt: `${event.systemPrompt}\n\n${formatPlanContextBlock(activeCtx)}\n\n${formatActivePlanBlock(activeCtx, "revise", summary)}\n\nReply with clarification answers; the harness will treat this as plan amend.`,
			};
		}

		if (!parsed) return undefined;

		const { command, args } = parsed;

		if (
			!isHarnessBootstrapPrompt(userPrompt) &&
			!hasHarnessAbortSignal(userPrompt)
		) {
			const policyBlock = getPolicyTransitionBlock(userPrompt, entries);
			if (policyBlock.blocked) {
				return {
					message: {
						customType: "harness-run-context-block",
						display: true,
						content:
							policyBlock.message ?? "Harness command blocked by policy phase.",
					},
				};
			}
		}

		if (command === "harness-new-run") {
			if (activeCtx?.status === "active") {
				activeCtx.status = "aborted";
				activeCtx.plan_ready = false;
				activeCtx.last_outcome = "abandoned";
				persistContext(pi, activeCtx);
			}
			const task = extractTaskSummary(args, userPrompt);
			activeCtx = createFreshRunContext(sessionId, projectRoot, task);
			persistContext(pi, activeCtx);
			return {
				systemPrompt: `${event.systemPrompt}\n\n${formatPlanContextBlock(activeCtx)}\n\n${formatActivePlanBlock(activeCtx, "create")}`,
			};
		}

		if (command === "harness-use-run") {
			const parsed = parseHarnessUseRunArgs(args);
			if (!parsed.runId) {
				return {
					message: {
						customType: "harness-run-context-block",
						display: true,
						content: "Usage: /harness-use-run <run-id> [--claim] [--readonly]",
					},
				};
			}
			const disk = await loadRunContextFromDisk(parsed.runId, projectRoot);
			if (!disk) {
				return {
					message: {
						customType: "harness-run-context-block",
						display: true,
						content: `No run directory for ${parsed.runId}. Check .pi/harness/runs/.`,
					},
				};
			}
			activeCtx = {
				...disk,
				pi_session_id: sessionId,
				turn_override_run_id: parsed.runId,
			};
			if (parsed.claim) {
				activeCtx = claimRunOwnership(activeCtx, sessionId);
			}
			const statuses = await resolveCompletionStatuses(
				getEntries(ctx),
				activeCtx.run_id,
				projectRoot,
			);
			if (activeCtx.owner_pi_session_id !== sessionId && !parsed.claim) {
				activeCtx.next_recommended_command =
					"Read-only: use /harness-use-run <run-id> --claim to take ownership, or /harness-new-run.";
			} else {
				activeCtx.next_recommended_command = nextStepAfterOutcome({
					phase: activeCtx.phase,
					planStatus: activeCtx.plan_ready ? "ready" : null,
					lastCompletedStep: activeCtx.last_completed_step,
					lastOutcome: activeCtx.last_outcome,
					executionStatus: statuses.executionStatus,
					evalStatus: statuses.evalStatus,
					adversaryComplete: statuses.adversaryComplete,
					aborted: activeCtx.status === "aborted",
				});
			}
			activeCtx.updated_at = nowIso();
			persistContext(pi, activeCtx);
			syncPolicyFromRunContext(pi, getEntries(ctx), activeCtx);
			return {
				systemPrompt: `${event.systemPrompt}\n\n${formatPlanContextBlock(activeCtx)}`,
			};
		}

		if (command === "harness-run-status") {
			return undefined;
		}

		if (
			command === "harness-plan" &&
			activeCtx &&
			isNewTaskPlanBlocked(activeCtx, userPrompt) &&
			!isAmendPlanAllowed(activeCtx, userPrompt, driftActive)
		) {
			return {
				message: {
					customType: "harness-run-context-block",
					display: true,
					content:
						"Active harness run in progress. Use /harness-abort or /harness-new-run before starting a new task plan.",
				},
			};
		}

		const resolved = resolveArgsForCommand(command, args, activeCtx);
		if (resolved.overrideRun && resolved.runId) {
			const disk = await loadRunContextFromDisk(resolved.runId, projectRoot);
			if (disk) activeCtx = { ...disk, turn_override_run_id: resolved.runId };
		}

		if (
			command === "harness-plan" ||
			command === "harness-auto" ||
			(!activeCtx && command !== "harness-abort")
		) {
			if (
				!activeCtx ||
				!shouldReuseHarnessRunId(userPrompt, activeCtx, command)
			) {
				const task = extractTaskSummary(args, userPrompt);
				activeCtx = createFreshRunContext(sessionId, projectRoot, task);
			}
			activeCtx.plan_ready = false;
			activeCtx.phase = "plan";
			activeCtx.status = "active";
			if (command === "harness-plan") {
				const task = extractTaskSummary(args, userPrompt);
				if (task) activeCtx.task_summary = task;
			}
			if (turn) {
				pi.appendEntry("harness-plan-attempt", {
					run_id: activeCtx.run_id,
					command,
					started_at: turn.invoked_at,
				});
			} else {
				pi.appendEntry("harness-plan-attempt", {
					run_id: activeCtx.run_id,
					command,
					started_at: nowIso(),
				});
			}
		} else if (
			activeCtx &&
			shouldReuseHarnessRunId(userPrompt, activeCtx, command)
		) {
			activeCtx.turn_override_run_id = resolved.overrideRun
				? resolved.runId
				: null;
		} else if (!activeCtx) {
			const pointer = await loadProjectActiveRun(projectRoot);
			if (pointer) {
				if (isStaleActiveRunPointer(pointer, projectRoot)) {
					const crossSessionCmd = new Set([
						"harness-eval",
						"harness-review",
						"harness-steer",
						"harness-critic",
						"harness-trace",
						"harness-incident",
					]);
					if (crossSessionCmd.has(command)) {
						return {
							message: {
								customType: "harness-run-context-block",
								display: true,
								content:
									'Project active-run pointer is stale or from another workspace. Run /harness-plan "<task>" or /harness-use-run <run-id> for recovery.',
							},
						};
					}
				} else {
					const disk = await loadRunContextFromDisk(
						pointer.run_id,
						projectRoot,
					);
					if (disk) activeCtx = disk;
				}
			}
		}

		if (!activeCtx) {
			return {
				message: {
					customType: "harness-run-context-block",
					display: true,
					content:
						'No active harness run. Run /harness-plan "<task>" first, or /harness-use-run <run-id> for recovery.',
				},
			};
		}

		activeCtx.phase = policyPhase;
		activeCtx.updated_at = new Date().toISOString();
		activeCtx.pi_session_id = sessionId;

		if (
			shouldAutoClaimHarnessRun(command, args) &&
			activeCtx.owner_pi_session_id !== sessionId
		) {
			activeCtx = claimRunOwnership(activeCtx, sessionId);
		}

		if (resolved.planPath && resolved.runId) {
			const check = validatePlanOverridePath(
				resolved.planPath,
				resolved.runId,
				projectRoot,
			);
			if (!check.ok) {
				return {
					message: {
						customType: "harness-run-context-block",
						display: true,
						content: check.reason ?? "Invalid --plan override",
					},
				};
			}
			activeCtx.plan_packet_path = resolved.planPath;
		}

		if (command === "harness-run" && !activeCtx.plan_ready) {
			return {
				message: {
					customType: "harness-run-context-block",
					display: true,
					content: "Plan not ready. Run /harness-plan first.",
				},
			};
		}

		if (
			command === "harness-run" &&
			activeCtx.plan_ready &&
			activeCtx.last_completed_step === "execute" &&
			activeCtx.last_outcome === "completed"
		) {
			return {
				message: {
					customType: "harness-run-context-block",
					display: true,
					content:
						"Execute already completed for this run. Next: /harness-review (same session), or /harness-abort to replan.",
				},
			};
		}

		let planSummary: PlanPacketSummary | null = null;
		let planPacketForSpawn: Awaited<ReturnType<typeof readPlanPacketFromPath>> =
			null;
		if (activeCtx.plan_packet_path) {
			planPacketForSpawn = await readPlanPacketFromPath(
				activeCtx.plan_packet_path,
			);
			if (planPacketForSpawn) {
				planSummary = planPacketSummary(
					planPacketForSpawn,
					activeCtx.plan_packet_path,
					activeCtx.plan_ready ? "ready" : "draft",
				);
				activeCtx.plan_id = planPacketForSpawn.plan_id ?? activeCtx.plan_id;
			}
		}

		let contextSpawnOpts:
			| Parameters<typeof formatPlanContextBlock>[1]
			| undefined;
		if (command === "harness-run" && planPacketForSpawn) {
			const criticalIds =
				criticalPathWorkItemIdsFromPlanPacket(planPacketForSpawn);
			contextSpawnOpts = {
				mode: "execute",
				critical_path_work_item_ids: criticalIds,
			};
		}

		let activePlanBlock = "";
		if (command === "harness-plan" || command === "harness-auto") {
			const mode =
				activeCtx.plan_ready || activeCtx.status === "aborted"
					? "revise"
					: "create";
			activePlanBlock = formatActivePlanBlock(activeCtx, mode, planSummary);
		} else if (command === "harness-run") {
			activePlanBlock = formatActivePlanBlock(
				activeCtx,
				"execute",
				planSummary,
			);
		} else if (command === "harness-steer") {
			activePlanBlock = formatActivePlanBlock(
				activeCtx,
				"execute",
				planSummary,
			);
			contextSpawnOpts = {
				mode: "repair",
				repair_brief_path: "artifacts/repair-brief.yaml",
			};
		} else if (
			command === "harness-eval" ||
			command === "harness-review" ||
			command === "harness-critic"
		) {
			activePlanBlock = formatActivePlanBlock(activeCtx, "read", planSummary);
		}

		persistContext(pi, activeCtx);

		return {
			systemPrompt: `${event.systemPrompt}\n\n${formatPlanContextBlock(activeCtx, contextSpawnOpts)}${activePlanBlock ? `\n\n${activePlanBlock}` : ""}`,
		};
	});

	pi.on("agent_end", async (_event, ctx) => {
		const projectRoot = process.cwd();
		const entries = getEntries(ctx);
		if (!activeCtx) {
			activeCtx = getLatestRunContext(entries);
		}
		if (!activeCtx) return;

		const userEntries = entries.filter((e) => {
			const entry = e as { type?: string; message?: { role?: string } };
			return entry.type === "message" && entry.message?.role === "user";
		});
		const lastUser = userEntries[userEntries.length - 1] as
			| { message?: { content?: string | unknown[] } }
			| undefined;
		let lastPrompt = "";
		if (lastUser?.message?.content) {
			lastPrompt =
				typeof lastUser.message.content === "string"
					? lastUser.message.content
					: "";
		}
		const lastTurn = getLatestHarnessTurn(entries);
		const parsed = lastTurn
			? { command: lastTurn.command, args: lastTurn.args }
			: parseHarnessSlashInput(userVisiblePromptSlice(lastPrompt));
		if (!parsed && !needsClarificationFollowUp(activeCtx)) return;

		if (parsed?.command === "harness-abort") {
			activeCtx.status = "aborted";
			activeCtx.plan_ready = false;
			activeCtx.last_outcome = "aborted";
			activeCtx.last_completed_step = "abort";
			activeCtx.next_recommended_command = activeCtx.task_summary
				? `/harness-plan "${activeCtx.task_summary}"`
				: '/harness-plan "<task>"';
			persistContext(pi, activeCtx);
			const msg = `Harness aborted. Next: ${activeCtx.next_recommended_command}`;
			if (ctx.hasUI) ctx.ui.notify(msg, "warning");
			else
				pi.sendMessage({
					customType: "harness-step-handoff",
					content: msg,
					display: true,
				});
			return;
		}

		let planReady = activeCtx.plan_ready;
		if (
			(parsed?.command === "harness-plan" ||
				parsed?.command === "harness-auto") &&
			activeCtx.plan_packet_path
		) {
			const packet = await readPlanPacketFromPath(activeCtx.plan_packet_path);
			const validation = validatePlanPacket(packet);
			const approved = hasPlanUserApproval(entries, {
				sincePlanCommand: true,
				planId: packet?.plan_id ?? null,
			});
			planReady = validation.valid && approved;
			if (validation.valid && !approved) {
				activeCtx.last_outcome = "needs_clarification";
				activeCtx.last_completed_step = "plan";
				const msg =
					"Plan file exists but user approval was not recorded. Planner must call approve_plan (or bridged ask_user Approve) before writing plan-packet.yaml.";
				if (ctx.hasUI) ctx.ui.notify(msg, "warning");
				else
					pi.sendMessage({
						customType: "harness-plan-packet",
						content: msg,
						display: true,
					});
			} else if (planReady && packet?.plan_id) {
				activeCtx.plan_id = packet.plan_id;
				syncPolicyFromPlan(pi, entries, packet.plan_id, "plan", true);
				const summary = planPacketSummary(packet, activeCtx.plan_packet_path);
				pi.appendEntry("harness-plan-packet", summary);
				activeCtx.last_completed_step = "plan";
				activeCtx.last_outcome = summary.plan_status;
			} else if (!validation.valid) {
				activeCtx.last_outcome = "needs_clarification";
				activeCtx.last_completed_step = "plan";
			}
		}

		activeCtx.plan_ready = planReady;

		const statuses = await resolveCompletionStatuses(
			entries,
			activeCtx.run_id,
			projectRoot,
		);
		if (parsed?.command === "harness-run") {
			activeCtx.last_completed_step = "execute";
			let execStatus = statuses.executionStatus;
			if (!execStatus) {
				const handoff = await readExecutorHandoffFromRun(
					activeCtx.run_id,
					projectRoot,
				);
				execStatus = handoff?.execution_status ?? null;
			}
			activeCtx.last_outcome = execStatus ?? "completed";
			activeCtx.phase = "evaluate";
		}
		if (parsed?.command === "harness-steer") {
			activeCtx.last_completed_step = "steer";
			activeCtx.steer_attempt = (activeCtx.steer_attempt ?? 0) + 1;
			activeCtx.steer_max_attempts =
				activeCtx.steer_max_attempts ?? steerMaxAttemptsFromEnv();
			activeCtx.phase = "execute";
			syncPolicyFromRunContext(pi, getEntries(ctx), activeCtx);
		}
		if (
			parsed?.command === "harness-eval" ||
			parsed?.command === "harness-review" ||
			parsed?.command === "harness-critic"
		) {
			activeCtx.last_completed_step =
				parsed.command === "harness-critic" ? "adversary" : "review";
			if (statuses.evalStatus) {
				activeCtx.last_outcome = statuses.evalStatus;
			}
			if (statuses.adversaryComplete) {
				activeCtx.phase = "adversary";
				activeCtx.last_completed_step = "adversary";
			} else if (statuses.evalStatus) {
				activeCtx.phase = "evaluate";
			}
		}

		const reviewOutcome = await readReviewOutcomeFromRun(
			activeCtx.run_id,
			projectRoot,
		);
		const reviewComplete =
			activeCtx.last_completed_step === "review" ||
			activeCtx.last_completed_step === "adversary";
		const next = nextStepAfterOutcome({
			phase: activeCtx.phase,
			planStatus: statuses.planStatus,
			lastCompletedStep: activeCtx.last_completed_step,
			lastOutcome: activeCtx.last_outcome,
			executionStatus: statuses.executionStatus,
			evalStatus: statuses.evalStatus,
			adversaryComplete: statuses.adversaryComplete,
			aborted: activeCtx.status === "aborted",
			remediationClass: reviewOutcome?.remediation_class ?? null,
			steerAttempt: activeCtx.steer_attempt ?? 0,
			steerMaxAttempts:
				activeCtx.steer_max_attempts ?? steerMaxAttemptsFromEnv(),
			reviewComplete,
		});
		activeCtx.next_recommended_command = next;
		activeCtx.updated_at = new Date().toISOString();

		if (
			parsed?.command === "harness-run" &&
			activeCtx.last_outcome === "completed"
		) {
			syncPolicyFromRunContext(pi, getEntries(ctx), activeCtx);
		}

		persistContext(pi, activeCtx);

		pi.appendEntry("harness-step-handoff", {
			next_command: next,
			plan_status: statuses.planStatus,
			execution_status: statuses.executionStatus,
			eval_status: statuses.evalStatus,
			phase: activeCtx.phase,
		});

		if (next && parsed) {
			const notify = `Next: ${next}`;
			if (ctx.hasUI) ctx.ui.notify(notify, "info");
			else
				pi.sendMessage({
					customType: "harness-step-handoff",
					content: notify,
					display: true,
				});
		}
	});

	pi.on("tool_result", async (event, ctx) => {
		if (event.isError) return;
		if (event.toolName !== "ask_user" && event.toolName !== "approve_plan") {
			return;
		}
		const approval = parsePlanApprovalFromMessage({
			toolName: event.toolName,
			details: event.details,
			content: event.content,
		});
		if (!approval) return;
		const entries = getEntries(ctx);
		const runCtx = getLatestRunContext(entries) ?? activeCtx;
		if (!runCtx) return;
		pi.appendEntry("harness-plan-approval", {
			plan_id: approval.plan_id ?? runCtx.plan_id,
			approved_at: approval.approved_at,
			source: approval.source,
		});
	});

	pi.on("tool_call", async (event, ctx) => {
		if (isSubmitToolName(event.toolName)) {
			const decision = evaluateHarnessSubagentToolCall(
				event.toolName,
				event.input as Record<string, unknown>,
				"parent-orchestrator",
			);
			if (decision.action === "block") {
				return { block: true, reason: decision.reason };
			}
		}
		if (event.toolName === "write") {
			const entries = getEntries(ctx);
			const runCtx = getLatestRunContext(entries) ?? activeCtx;
			if (runCtx) {
				const blocked = await coerceScopedHarnessYamlWrite(
					event,
					runCtx,
					process.cwd(),
				);
				if (blocked) return blocked;
			}
		}
		if (activeCtx?.plan_packet_path) {
			const entries = getEntries(ctx);
			if (hasPlanUserApproval(entries, { sincePlanCommand: true })) {
				if (event.toolName === "approve_plan") {
					return {
						block: true,
						reason:
							"harness-run-context: plan already approved via planner subagent; do not call approve_plan again in the parent session.",
					};
				}
				if (event.toolName === "ask_user") {
					const input = event.input as {
						question?: string;
						options?: unknown[];
					};
					if (isPlanApprovalAskUser(input)) {
						return {
							block: true,
							reason:
								"harness-run-context: plan already approved via planner subagent; do not call ask_user for plan approval in the parent session.",
						};
					}
				}
			}
		}
		if (!activeCtx?.plan_packet_path) return undefined;
		const phase = activeCtx.phase;
		if (phase !== "evaluate" && phase !== "adversary") return undefined;
		if (event.toolName !== "write" && event.toolName !== "edit") {
			return undefined;
		}
		const target = String(
			(event.input as { path?: string; filePath?: string }).path ??
				(event.input as { filePath?: string }).filePath ??
				"",
		);
		if (target.includes("plan-packet.yaml")) {
			return {
				block: true,
				reason:
					"harness-run-context: plan-packet.yaml is read-only in evaluate/adversary phases.",
			};
		}
		return undefined;
	});

	pi.registerCommand("harness-run-status", {
		description:
			"Show harness phase, plan readiness, and next command (no run id)",
		handler: async (_args, ctx) => {
			const sessionId = ctx.sessionManager.getSessionId();
			const projectRoot = process.cwd();
			const entries = getEntries(ctx);
			let ctxState = getLatestRunContext(entries) ?? activeCtx;
			if (!ctxState) {
				ctxState = await hydrateFromDisk(sessionId, projectRoot, entries);
			}
			if (!ctxState) {
				const msg = 'No active harness run. Start with /harness-plan "<task>".';
				if (ctx.hasUI) ctx.ui.notify(msg, "warning");
				return;
			}
			let summary: PlanPacketSummary | null = null;
			for (let i = entries.length - 1; i >= 0; i--) {
				const entry = entries[i] as SessionEntryLike;
				if (
					entry.type !== "custom" ||
					entry.customType !== "harness-plan-packet"
				)
					continue;
				summary = entry.data as PlanPacketSummary;
				break;
			}
			const lines = [
				"Harness run status:",
				`  phase: ${ctxState.phase}`,
				`  status: ${ctxState.status}`,
				`  plan_ready: ${ctxState.plan_ready}`,
				`  plan_id: ${ctxState.plan_id ?? "(none)"}`,
				summary
					? `  scope: ${summary.scope_one_liner}`
					: "  scope: (no plan summary yet)",
				`  last_step: ${ctxState.last_completed_step ?? "(none)"}`,
				`  last_outcome: ${ctxState.last_outcome ?? "(none)"}`,
				`  next: ${ctxState.next_recommended_command ?? "/harness-run-status"}`,
			];
			const text = lines.join("\n");
			if (ctx.hasUI) ctx.ui.notify(text, "info");
			else
				pi.sendMessage({
					customType: "harness-run-status",
					content: text,
					display: true,
				});
		},
	});

	pi.registerCommand("harness-new-run", {
		description: "Abandon current active run and start a fresh harness run",
		handler: async (args, ctx) => {
			const sessionId = ctx.sessionManager.getSessionId();
			const projectRoot = process.cwd();
			if (activeCtx?.status === "active") {
				activeCtx.status = "aborted";
				activeCtx.plan_ready = false;
				persistContext(pi, activeCtx);
			}
			activeCtx = createFreshRunContext(
				sessionId,
				projectRoot,
				args.trim() || null,
			);
			persistContext(pi, activeCtx);
			const msg =
				'New harness run allocated. Next: /harness-plan "<your task>"';
			if (ctx.hasUI) ctx.ui.notify(msg, "info");
		},
	});

	pi.registerCommand("harness-plan-commit", {
		description:
			"Write approved plan-packet.yaml to the active run (requires harness-plan-approval)",
		handler: async (args, ctx) => {
			const projectRoot = process.cwd();
			const entries = getEntries(ctx);
			let runCtx = getLatestRunContext(entries) ?? activeCtx;
			if (!runCtx) {
				runCtx = await hydrateFromDisk(
					ctx.sessionManager.getSessionId(),
					projectRoot,
					entries,
				);
			}
			if (!runCtx?.plan_packet_path) {
				const msg = "No active harness run. Run /harness-plan first.";
				if (ctx.hasUI) ctx.ui.notify(msg, "warning");
				return;
			}
			if (
				!hasPlanUserApproval(entries, {
					sincePlanCommand: true,
					planId: runCtx.plan_id,
				})
			) {
				const msg =
					"Plan commit blocked: no user approval recorded. Approve via approve_plan in this session first.";
				if (ctx.hasUI) ctx.ui.notify(msg, "warning");
				return;
			}
			const pathArg = args.trim();
			let packetPath = runCtx.plan_packet_path;
			if (pathArg) {
				packetPath = pathArg;
			}
			const packet = await readPlanPacketFromPath(packetPath);
			const validation = validatePlanPacket(packet);
			if (!validation.valid || !packet) {
				const msg = !packet
					? "Plan packet file missing or unreadable."
					: `Invalid plan packet: ${validation.errors.join("; ")}`;
				if (ctx.hasUI) ctx.ui.notify(msg, "error");
				return;
			}
			const target = runCtx.plan_packet_path;
			if (!target) {
				if (ctx.hasUI)
					ctx.ui.notify("No plan_packet_path on active run.", "error");
				return;
			}
			if (pathArg && pathArg !== target) {
				const raw = await readFile(pathArg, "utf-8");
				await writeFile(target, raw, "utf-8");
			}
			runCtx.plan_id = packet.plan_id ?? runCtx.plan_id;
			runCtx.plan_ready = true;
			runCtx.phase = "plan";
			runCtx.last_completed_step = "plan";
			runCtx.last_outcome = "ready";
			runCtx.next_recommended_command = "/harness-run";
			runCtx.updated_at = nowIso();
			activeCtx = runCtx;
			persistContext(pi, runCtx);
			syncPolicyFromPlan(
				pi,
				entries,
				runCtx.plan_id ?? packet.plan_id ?? "plan-pending",
				"plan",
				true,
			);
			const summary = planPacketSummary(packet, target, "ready");
			pi.appendEntry("harness-plan-packet", summary);
			const msg = `Plan committed: ${target}`;
			if (ctx.hasUI) ctx.ui.notify(msg, "info");
		},
	});

	pi.registerTool({
		name: "write_harness_yaml",
		label: "Write Harness YAML",
		description:
			"Write a plan-phase harness artifact as canonical YAML (parses subagent JSON or YAML, never embeds JSON in .yaml files).",
		promptSnippet:
			"Persist plan artifacts (decomposition, hypothesis, stack, review rounds) as real YAML.",
		promptGuidelines: [
			"Use write_harness_yaml for all artifacts/*.yaml and research-brief.yaml updates during /harness-plan.",
			"Pass the subagent fenced json or yaml block as content; the tool converts to YAML on disk.",
			"Do not use write with stringified JSON for .yaml paths.",
			"plan-packet.yaml after approval: prefer create_plan; write_harness_yaml is for drafts and side artifacts only.",
		],
		parameters: Type.Object({
			path: Type.String({
				description:
					"Path under the active run, e.g. artifacts/decomposition.yaml or research-brief.yaml",
			}),
			content: Type.String({
				description:
					"YAML or JSON document (fenced or raw) matching the artifact schema",
			}),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const entries = getEntries(ctx);
			const runCtx = getLatestRunContext(entries) ?? activeCtx;
			if (!runCtx?.run_id) {
				return {
					content: [
						{
							type: "text",
							text: 'No active harness run. Run /harness-plan "<task>" first.',
						},
					],
					details: {},
					isError: true,
				};
			}
			const pathArg = String((params as { path?: string }).path ?? "").trim();
			const content = String((params as { content?: string }).content ?? "");
			const HARNESS_YAML_INLINE_MAX = 32 * 1024;
			if (content.length > HARNESS_YAML_INLINE_MAX) {
				return {
					content: [
						{
							type: "text",
							text: `Content exceeds ${HARNESS_YAML_INLINE_MAX} bytes. Subagent must submit_* to disk, then use merge_harness_yaml with source_path or a small patch.`,
						},
					],
					details: { path: pathArg, bytes: content.length },
					isError: true,
				};
			}
			if (!pathArg || !content.trim()) {
				return {
					content: [
						{
							type: "text",
							text: "write_harness_yaml requires path and content.",
						},
					],
					details: {},
					isError: true,
				};
			}
			const projectRoot = process.cwd();
			const absPath = normalizeHarnessPath(pathArg, projectRoot);
			const scoped = await isPlanPhaseScopedWrite(absPath, runCtx, projectRoot);
			if (!scoped) {
				return {
					content: [
						{
							type: "text",
							text: `Path not allowed: ${pathArg}. Must be under .pi/harness/runs/${runCtx.run_id}/ (artifacts/*.yaml, research-brief.yaml, etc.).`,
						},
					],
					details: { path: pathArg },
					isError: true,
				};
			}
			const relForGate = pathArg.replace(/\\/g, "/");
			const subagentOnly = new Set([
				"artifacts/eval-verdict.yaml",
				"artifacts/adversary-report.yaml",
			]);
			if (subagentOnly.has(relForGate)) {
				return {
					content: [
						{
							type: "text",
							text: `Path not allowed: ${pathArg}. Post-run verdicts must be written via submit_* in harness/evaluator or harness/adversary subagents; parent gates with harness_artifact_ready only.`,
						},
					],
					details: { path: pathArg },
					isError: true,
				};
			}
			if (/\.json$/i.test(relForGate) && relForGate.startsWith("artifacts/")) {
				return {
					content: [
						{
							type: "text",
							text: `Path not allowed: ${pathArg}. Plan artifacts under artifacts/ must be .yaml (use submit_* from subagents or write_harness_yaml with YAML content).`,
						},
					],
					details: { path: pathArg },
					isError: true,
				};
			}
			if (
				isReviewRoundArtifactPath(relForGate) &&
				!isReviewRoundYamlWriteAllowed()
			) {
				return {
					content: [
						{
							type: "text",
							text: `Blocked: ${pathArg} must be written via harness_debate_submit_round after lane YAML + messenger thread are complete. Parent sessions cannot author review-round files directly.`,
						},
					],
					details: { path: pathArg },
					isError: true,
				};
			}
			let doc: unknown;
			try {
				doc = parseStructuredDocument(content, pathArg);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return {
					content: [{ type: "text", text: msg }],
					details: { path: pathArg },
					isError: true,
				};
			}
			await mkdir(dirname(absPath), { recursive: true });
			await writeYamlFile(absPath, doc);
			return {
				content: [
					{
						type: "text",
						text: `Wrote ${pathArg} as canonical YAML.`,
					},
				],
				details: { path: absPath },
			};
		},
	});

	pi.registerTool({
		name: "merge_harness_yaml",
		label: "Merge Harness YAML",
		description:
			"Shallow-merge a patch or another run artifact into an existing harness YAML file (path-first).",
		promptSnippet:
			"Merge artifact paths without pasting large bodies into tool args.",
		promptGuidelines: [
			"Prefer source_path pointing at artifacts/*.yaml from subagent submit_*.",
			"Use patch for small top-level keys only.",
		],
		parameters: Type.Object({
			path: Type.String({
				description:
					"Target path under the active run, e.g. research-brief.yaml",
			}),
			patch: Type.Optional(
				Type.String({
					description: "Small YAML/JSON object merged into the target",
				}),
			),
			source_path: Type.Optional(
				Type.String({
					description:
						"Relative path under the run to merge into target (e.g. artifacts/implementation-research.yaml)",
				}),
			),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const entries = getEntries(ctx);
			const runCtx = getLatestRunContext(entries) ?? activeCtx;
			if (!runCtx?.run_id) {
				return {
					content: [{ type: "text", text: "No active harness run." }],
					details: {},
					isError: true,
				};
			}
			const pathArg = String((params as { path?: string }).path ?? "").trim();
			const patchRaw = String((params as { patch?: string }).patch ?? "");
			const sourcePath = String(
				(params as { source_path?: string }).source_path ?? "",
			).trim();
			if (!pathArg || (!patchRaw.trim() && !sourcePath)) {
				return {
					content: [
						{
							type: "text",
							text: "merge_harness_yaml requires path and patch or source_path.",
						},
					],
					details: {},
					isError: true,
				};
			}
			const projectRoot = process.cwd();
			const absPath = normalizeHarnessPath(pathArg, projectRoot);
			const scoped = await isPlanPhaseScopedWrite(absPath, runCtx, projectRoot);
			if (!scoped) {
				return {
					content: [
						{
							type: "text",
							text: `Path not allowed: ${pathArg}.`,
						},
					],
					details: { path: pathArg },
					isError: true,
				};
			}
			const runRoot = join(
				projectRoot,
				".pi",
				"harness",
				"runs",
				runCtx.run_id,
			);
			let existing: Record<string, unknown> = {};
			try {
				const { readYamlFile } = await import("../lib/harness-yaml.js");
				const cur = await readYamlFile(absPath, pathArg);
				if (cur && typeof cur === "object" && !Array.isArray(cur)) {
					existing = cur as Record<string, unknown>;
				}
			} catch {
				existing = {};
			}
			let patchDoc: Record<string, unknown>;
			if (sourcePath) {
				const srcRel = sourcePath.replace(/\\/g, "/").replace(/^\.\//, "");
				const srcAbs = srcRel.startsWith(".pi/")
					? normalizeHarnessPath(srcRel, projectRoot)
					: join(runRoot, srcRel);
				try {
					patchDoc = parseStructuredDocument(
						await readFile(srcAbs, "utf-8"),
						sourcePath,
					) as Record<string, unknown>;
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					return {
						content: [{ type: "text", text: msg }],
						details: { source_path: sourcePath },
						isError: true,
					};
				}
			} else {
				try {
					patchDoc = parseStructuredDocument(patchRaw, pathArg) as Record<
						string,
						unknown
					>;
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					return {
						content: [{ type: "text", text: msg }],
						details: { path: pathArg },
						isError: true,
					};
				}
			}
			const merged = { ...existing, ...patchDoc };
			await mkdir(dirname(absPath), { recursive: true });
			await writeYamlFile(absPath, merged);
			return {
				content: [
					{
						type: "text",
						text: `Merged into ${pathArg} as canonical YAML.`,
					},
				],
				details: { path: absPath },
			};
		},
	});

	pi.registerTool({
		name: "harness_synthesize_repair_brief",
		label: "Synthesize Repair Brief",
		description:
			"Build artifacts/repair-brief.yaml from review-outcome, eval-verdict, and adversary paths (no large inline bodies).",
		promptSnippet:
			"After /harness-review when remediation_class is implementation_gap.",
		promptGuidelines: [
			"Pass artifact paths only; tool reads YAML from disk.",
			"Default output: artifacts/repair-brief.yaml with steer_attempt from run context + 1.",
		],
		parameters: Type.Object({
			review_outcome_path: Type.Optional(Type.String()),
			eval_verdict_path: Type.Optional(Type.String()),
			adversary_report_path: Type.Optional(Type.String()),
			plan_packet_path: Type.Optional(Type.String()),
			output_path: Type.Optional(
				Type.String({
					description: "Default artifacts/repair-brief.yaml",
				}),
			),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const entries = getEntries(ctx);
			const runCtx = getLatestRunContext(entries) ?? activeCtx;
			if (!runCtx?.run_id) {
				return {
					content: [{ type: "text", text: "No active harness run." }],
					details: {},
					isError: true,
				};
			}
			const projectRoot = process.cwd();
			const steerAttempt = (runCtx.steer_attempt ?? 0) + 1;
			const { synthesizeRepairBrief } = await import(
				"../lib/harness-repair-brief.js"
			);
			const brief = await synthesizeRepairBrief({
				runId: runCtx.run_id,
				projectRoot,
				steerAttempt,
				reviewOutcomePath: (params as { review_outcome_path?: string })
					.review_outcome_path,
				evalVerdictPath: (params as { eval_verdict_path?: string })
					.eval_verdict_path,
				adversaryReportPath: (params as { adversary_report_path?: string })
					.adversary_report_path,
				planPacketPath:
					(params as { plan_packet_path?: string }).plan_packet_path ??
					runCtx.plan_packet_path ??
					"plan-packet.yaml",
			});
			const outputPath =
				String((params as { output_path?: string }).output_path ?? "").trim() ||
				"artifacts/repair-brief.yaml";
			const absOut = normalizeHarnessPath(
				outputPath.startsWith(runCtx.run_id)
					? outputPath
					: join(
							projectRoot,
							".pi",
							"harness",
							"runs",
							runCtx.run_id,
							outputPath,
						),
				projectRoot,
			);
			const scoped = await isPlanPhaseScopedWrite(absOut, runCtx, projectRoot);
			if (!scoped) {
				return {
					content: [
						{
							type: "text",
							text: `Output path not allowed: ${outputPath}`,
						},
					],
					details: {},
					isError: true,
				};
			}
			await mkdir(dirname(absOut), { recursive: true });
			await writeYamlFile(absOut, brief);
			return {
				content: [
					{
						type: "text",
						text: `Wrote ${outputPath} (steer_attempt=${steerAttempt}).`,
					},
				],
				details: { path: absOut, steer_attempt: steerAttempt },
			};
		},
	});

	pi.registerTool({
		name: "harness_artifact_ready",
		label: "Harness Artifact Ready",
		description:
			"Check harness artifact paths exist and pass minimal schema/content gates under the active run.",
		parameters: Type.Object({
			paths: Type.Array(Type.String(), {
				minItems: 1,
				description:
					"Relative paths under the run dir, e.g. artifacts/decomposition.yaml",
			}),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const entries = getEntries(ctx);
			const runCtx = getLatestRunContext(entries) ?? activeCtx;
			if (!runCtx?.run_id) {
				return {
					content: [{ type: "text", text: "No active harness run." }],
					details: {},
					isError: true,
				};
			}
			const paths = (params as { paths?: string[] }).paths ?? [];
			const projectRoot = process.cwd();
			const runRoot = join(
				projectRoot,
				".pi",
				"harness",
				"runs",
				runCtx.run_id,
			);
			const specsDir = join(projectRoot, ".pi", "harness", "specs");
			const { validateHarnessArtifactPaths } = await import(
				"./lib/harness-artifact-gate.js"
			);
			const gate = await validateHarnessArtifactPaths(runRoot, paths, specsDir);
			const text = gate.ok
				? `All ${gate.present.length} artifact(s) present and valid.`
				: [
						gate.missing.length > 0
							? `Missing: ${gate.missing.join(", ")}`
							: null,
						gate.errors.length > 0 ? gate.errors.join("\n") : null,
					]
						.filter(Boolean)
						.join("\n");
			return {
				content: [{ type: "text", text }],
				details: {
					ok: gate.ok,
					present: gate.present,
					missing: gate.missing,
					errors: gate.errors,
					run_id: runCtx.run_id,
				},
				isError: !gate.ok,
			};
		},
	});

	pi.registerCommand("harness-use-run", {
		description:
			"Point this session at an existing run directory (recovery; --claim for write ownership)",
		handler: async (args, ctx) => {
			const parsed = parseHarnessUseRunArgs(args);
			if (!parsed.runId) {
				if (ctx.hasUI)
					ctx.ui.notify(
						"Usage: /harness-use-run <run-id> [--claim] [--readonly]",
						"warning",
					);
				return;
			}
			const projectRoot = process.cwd();
			const sessionId = ctx.sessionManager.getSessionId();
			const disk = await loadRunContextFromDisk(parsed.runId, projectRoot);
			if (!disk) {
				if (ctx.hasUI) ctx.ui.notify(`Run not found: ${parsed.runId}`, "error");
				return;
			}
			activeCtx = {
				...disk,
				pi_session_id: sessionId,
			};
			if (parsed.claim) {
				activeCtx = claimRunOwnership(activeCtx, sessionId);
			}
			const statuses = await resolveCompletionStatuses(
				getEntries(ctx),
				activeCtx.run_id,
				projectRoot,
			);
			if (activeCtx.owner_pi_session_id !== sessionId && !parsed.claim) {
				activeCtx.next_recommended_command =
					"Read-only: use /harness-use-run <run-id> --claim to take ownership.";
			} else {
				activeCtx.next_recommended_command = nextStepAfterOutcome({
					phase: activeCtx.phase,
					planStatus: activeCtx.plan_ready ? "ready" : null,
					lastCompletedStep: activeCtx.last_completed_step,
					lastOutcome: activeCtx.last_outcome,
					executionStatus: statuses.executionStatus,
					evalStatus: statuses.evalStatus,
					adversaryComplete: statuses.adversaryComplete,
					aborted: activeCtx.status === "aborted",
				});
			}
			activeCtx.updated_at = nowIso();
			persistContext(pi, activeCtx);
			syncPolicyFromRunContext(pi, getEntries(ctx), activeCtx);
			if (ctx.hasUI) {
				const mode = parsed.claim ? "claimed" : "bound (read-only)";
				ctx.ui.notify(
					`Session ${mode} to run ${parsed.runId}. See /harness-run-status.`,
					"info",
				);
			}
		},
	});
}
