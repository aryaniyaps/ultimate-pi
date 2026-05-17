/**
 * harness-run-context — session-scoped active run + plan injection.
 *
 * Hook order: runs before trace-recorder (alphabetically h < t). Allocates run_id
 * in before_agent_start so trace-recorder reuses it on agent_start.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	canonicalPlanPath,
	createFreshRunContext,
	driftGateActive,
	extractCompletionStatuses,
	formatActivePlanBlock,
	formatPlanContextBlock,
	getLatestPolicyPhase,
	getLatestRunContext,
	getPolicyTransitionBlock,
	type HarnessRunContext,
	hasHarnessAbortSignal,
	hasPlanUserApproval,
	isAmendPlanAllowed,
	isHarnessBootstrapPrompt,
	isHarnessSlashCommand,
	isNewTaskPlanBlocked,
	isStaleActiveRunPointer,
	loadProjectActiveRun,
	loadRunContextFromDisk,
	nextStepAfterOutcome,
	nowIso,
	type PlanPacketSummary,
	parseAskUserApprovalFromMessage,
	parseHarnessSlashCommand,
	planPacketSummary,
	readPlanPacketFromPath,
	resolveArgsForCommand,
	saveProjectActiveRun,
	saveRunContextToDisk,
	shouldReuseHarnessRunId,
	userVisiblePromptSlice,
	validatePlanOverridePath,
	validatePlanPacket,
} from "../lib/harness-run-context.js";

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
}

function extractTaskSummary(prompt: string): string | null {
	const quoted = prompt.match(/"([^"]+)"/);
	if (quoted?.[1]) return quoted[1];
	const cmd = parseHarnessSlashCommand(prompt);
	if (cmd?.args) return cmd.args.slice(0, 200);
	return null;
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

export default function harnessRunContext(pi: ExtensionAPI) {
	let activeCtx: HarnessRunContext | null = null;

	pi.on("session_start", async (_event, ctx) => {
		const sessionId = ctx.sessionManager.getSessionId();
		const projectRoot = process.cwd();
		const entries = getEntries(ctx);
		activeCtx = await hydrateFromDisk(sessionId, projectRoot, entries);
	});

	pi.on("before_agent_start", async (event, ctx) => {
		const sessionId = ctx.sessionManager.getSessionId();
		const projectRoot = process.cwd();
		const entries = getEntries(ctx);
		const userPrompt = userVisiblePromptSlice(event.prompt);
		const parsed = parseHarnessSlashCommand(userPrompt);
		const harnessTurn =
			isHarnessSlashCommand(userPrompt) ||
			needsClarificationFollowUp(activeCtx);

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
			getLatestPolicyPhase(entries) ?? activeCtx?.phase ?? "plan";
		const driftActive = driftGateActive(entries);

		// Plain-language follow-up after needs_clarification
		if (!parsed && needsClarificationFollowUp(activeCtx) && activeCtx) {
			activeCtx.phase = "plan";
			activeCtx.last_outcome = "needs_clarification";
			const packet = activeCtx.plan_packet_path
				? await readPlanPacketFromPath(activeCtx.plan_packet_path)
				: null;
			const summary = packet
				? planPacketSummary(
						packet,
						activeCtx.plan_packet_path!,
						"needs_clarification",
					)
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
			const task = extractTaskSummary(userPrompt);
			activeCtx = createFreshRunContext(sessionId, projectRoot, task);
			persistContext(pi, activeCtx);
			return {
				systemPrompt: `${event.systemPrompt}\n\n${formatPlanContextBlock(activeCtx)}\n\n${formatActivePlanBlock(activeCtx, "create")}`,
			};
		}

		if (command === "harness-use-run") {
			const runId = args.trim().split(/\s+/)[0];
			if (!runId) {
				return {
					message: {
						customType: "harness-run-context-block",
						display: true,
						content: "Usage: /harness-use-run <run-id>",
					},
				};
			}
			const disk = await loadRunContextFromDisk(runId, projectRoot);
			if (!disk) {
				return {
					message: {
						customType: "harness-run-context-block",
						display: true,
						content: `No run directory for ${runId}. Check .pi/harness/runs/.`,
					},
				};
			}
			activeCtx = {
				...disk,
				pi_session_id: sessionId,
				turn_override_run_id: runId,
			};
			if (activeCtx.owner_pi_session_id !== sessionId) {
				activeCtx.next_recommended_command =
					"Read-only: owner session holds this run. Use /harness-new-run to take over.";
			}
			persistContext(pi, activeCtx);
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
				const task = extractTaskSummary(userPrompt);
				activeCtx = createFreshRunContext(sessionId, projectRoot, task);
			}
			activeCtx.plan_ready = false;
			activeCtx.phase = "plan";
			activeCtx.status = "active";
			if (command === "harness-plan") {
				const task = extractTaskSummary(userPrompt);
				if (task) activeCtx.task_summary = task;
			}
			pi.appendEntry("harness-plan-attempt", {
				run_id: activeCtx.run_id,
				command,
				started_at: nowIso(),
			});
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
			const warn =
				"Plan already executed in this run. Prefer a new Pi session → /harness-eval, or /harness-abort to replan.";
			if (ctx.hasUI) ctx.ui.notify(warn, "warning");
		}

		let planSummary: PlanPacketSummary | null = null;
		if (activeCtx.plan_packet_path) {
			const packet = await readPlanPacketFromPath(activeCtx.plan_packet_path);
			if (packet) {
				planSummary = planPacketSummary(
					packet,
					activeCtx.plan_packet_path,
					activeCtx.plan_ready ? "ready" : "draft",
				);
				activeCtx.plan_id = packet.plan_id ?? activeCtx.plan_id;
			}
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
		} else if (
			command === "harness-eval" ||
			command === "harness-review" ||
			command === "harness-critic"
		) {
			activePlanBlock = formatActivePlanBlock(activeCtx, "read", planSummary);
		}

		persistContext(pi, activeCtx);

		return {
			systemPrompt: `${event.systemPrompt}\n\n${formatPlanContextBlock(activeCtx)}${activePlanBlock ? `\n\n${activePlanBlock}` : ""}`,
		};
	});

	pi.on("agent_end", async (_event, ctx) => {
		const entries = getEntries(ctx);
		const sessionId = ctx.sessionManager.getSessionId();
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
		const parsed = parseHarnessSlashCommand(userVisiblePromptSlice(lastPrompt));
		if (!parsed && !needsClarificationFollowUp(activeCtx)) return;

		const policyPhase = getLatestPolicyPhase(entries) ?? activeCtx.phase;
		activeCtx.phase = policyPhase;

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
					"Plan file exists but user approval was not recorded. Present the full plan and call ask_user (Approve) before writing plan-packet.json.";
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

		const statuses = extractCompletionStatuses(entries);
		if (parsed?.command === "harness-run") {
			activeCtx.last_completed_step = "execute";
			activeCtx.last_outcome =
				statuses.executionStatus ?? activeCtx.last_outcome ?? "completed";
		}
		if (parsed?.command === "harness-eval") {
			activeCtx.last_completed_step = "evaluate";
			activeCtx.last_outcome = statuses.evalStatus ?? activeCtx.last_outcome;
		}

		const next = nextStepAfterOutcome({
			phase: activeCtx.phase,
			planStatus: statuses.planStatus ?? activeCtx.last_outcome,
			executionStatus: statuses.executionStatus,
			evalStatus: statuses.evalStatus,
			aborted: activeCtx.status === "aborted",
		});
		activeCtx.next_recommended_command = next;
		activeCtx.updated_at = new Date().toISOString();

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
		if (event.toolName !== "ask_user" || event.isError) return;
		const approval = parseAskUserApprovalFromMessage({
			toolName: "ask_user",
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
			source: "ask_user",
		});
	});

	pi.on("tool_call", async (event) => {
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
		if (target.includes("plan-packet.json")) {
			return {
				block: true,
				reason:
					"harness-run-context: plan-packet.json is read-only in evaluate/adversary phases.",
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

	pi.registerCommand("harness-use-run", {
		description: "Point this session at an existing run directory (recovery)",
		handler: async (args, ctx) => {
			const runId = args.trim().split(/\s+/)[0];
			if (!runId) {
				if (ctx.hasUI)
					ctx.ui.notify("Usage: /harness-use-run <run-id>", "warning");
				return;
			}
			const projectRoot = process.cwd();
			const disk = await loadRunContextFromDisk(runId, projectRoot);
			if (!disk) {
				if (ctx.hasUI) ctx.ui.notify(`Run not found: ${runId}`, "error");
				return;
			}
			activeCtx = {
				...disk,
				pi_session_id: ctx.sessionManager.getSessionId(),
			};
			persistContext(pi, activeCtx);
			if (ctx.hasUI)
				ctx.ui.notify(
					`Session bound to run ${runId}. See /harness-run-status.`,
					"info",
				);
		},
	});
}
