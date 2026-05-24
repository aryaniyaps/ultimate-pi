/**
 * harness-run-context — session-scoped active run + plan injection.
 *
 * Hook order: runs before trace-recorder (alphabetically h < t). Allocates run_id
 * in before_agent_start so trace-recorder reuses it on agent_start.
 */

import {
	mkdir,
	readdir,
	readFile,
	rename,
	stat,
	writeFile,
} from "node:fs/promises";
import { basename, dirname, join } from "node:path";
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
import { blockRunContextMessage } from "./lib/harness-run-context-responses.js";
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

const PLAN_REVISION_ARTIFACT_FILES = new Set([
	"planning-context.yaml",
	"decomposition.yaml",
	"hypothesis.yaml",
	"implementation-research.yaml",
	"stack.yaml",
	"execution-plan-draft.yaml",
	"plan-phase-status.yaml",
	"plan-phase-waiver.yaml",
	"sentrux-manifest-proposal.yaml",
]);

const PLAN_REVISION_ARTIFACT_PREFIXES = [
	"hypothesis-validation-r",
	"review-round-r",
	"plan-evaluator-r",
	"plan-adversary-r",
	"sprint-contract-audit-r",
	"adversary-brief-r",
] as const;

async function moveIfExists(from: string, to: string): Promise<boolean> {
	try {
		await stat(from);
	} catch {
		return false;
	}
	await mkdir(dirname(to), { recursive: true });
	await rename(from, to);
	return true;
}

function isPlanRevisionArtifactFile(name: string): boolean {
	if (PLAN_REVISION_ARTIFACT_FILES.has(name)) return true;
	if (name === "review-round-consolidated.yaml") return true;
	return PLAN_REVISION_ARTIFACT_PREFIXES.some((prefix) =>
		name.startsWith(prefix),
	);
}

export async function archivePlanRevisionArtifacts(input: {
	projectRoot: string;
	runId: string;
	reason: string;
	recordedAt?: string;
}): Promise<{ archiveDir: string; moved: string[] }> {
	const recordedAt = input.recordedAt ?? nowIso();
	const revisionId = recordedAt.replace(/[:.]/g, "-");
	const runDir = join(input.projectRoot, ".pi", "harness", "runs", input.runId);
	const artifactsDir = join(runDir, "artifacts");
	const archiveDir = join(artifactsDir, "revisions", revisionId);
	const moved: string[] = [];

	async function archiveRel(rel: string): Promise<void> {
		const ok = await moveIfExists(join(runDir, rel), join(archiveDir, rel));
		if (ok) moved.push(rel);
	}

	await archiveRel("plan-packet.yaml");
	await archiveRel("plan-review.md");
	await archiveRel("research-brief.yaml");
	await archiveRel("debate-messenger");

	try {
		const names = await readdir(artifactsDir);
		for (const name of names) {
			if (!isPlanRevisionArtifactFile(name)) continue;
			await archiveRel(join("artifacts", name));
		}
	} catch {
		// No artifacts yet.
	}

	const debateRel = join(
		".pi",
		"harness",
		"debates",
		`plan-${input.runId}.jsonl`,
	);
	const debateArchived = await moveIfExists(
		join(input.projectRoot, debateRel),
		join(archiveDir, "debates", basename(debateRel)),
	);
	if (debateArchived) moved.push(debateRel);

	if (moved.length > 0) {
		await mkdir(archiveDir, { recursive: true });
		await writeFile(
			join(archiveDir, "revision-reset.json"),
			`${JSON.stringify(
				{
					schema_version: "1.0.0",
					run_id: input.runId,
					reason: input.reason,
					recorded_at: recordedAt,
					moved,
				},
				null,
				2,
			)}\n`,
			"utf-8",
		);
	}

	return { archiveDir, moved };
}

function shouldArchiveForPlanRevise(input: {
	command: string;
	mode: "create" | "revise" | null;
	runCtx: HarnessRunContext;
	reviewOutcome: Awaited<ReturnType<typeof readReviewOutcomeFromRun>>;
	userPrompt: string;
}): boolean {
	if (input.command !== "harness-plan" && input.command !== "harness-auto") {
		return false;
	}
	if (input.mode !== "revise") return false;
	const next = (input.runCtx.next_recommended_command ?? "").toLowerCase();
	const prompt = input.userPrompt.toLowerCase();
	return (
		input.reviewOutcome?.remediation_class === "plan_gap" ||
		next.includes("/harness-plan") ||
		next.includes("revise") ||
		prompt.includes("--mode revise") ||
		prompt.includes("--mode=revise") ||
		prompt.includes("mode: revise")
	);
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

async function applyAbortSignal(input: {
	pi: ExtensionAPI;
	activeCtx: HarnessRunContext | null;
	sessionId: string;
	projectRoot: string;
	entries: unknown[];
	userPrompt: string;
}): Promise<HarnessRunContext | null> {
	if (!input.userPrompt.toLowerCase().includes("harness-abort")) {
		return input.activeCtx;
	}
	const nextCtx =
		input.activeCtx ??
		(await hydrateFromDisk(input.sessionId, input.projectRoot, input.entries));
	if (!nextCtx) return nextCtx;
	nextCtx.status = "aborted";
	nextCtx.plan_ready = false;
	nextCtx.last_outcome = "aborted";
	nextCtx.last_completed_step = "abort";
	nextCtx.next_recommended_command = nextCtx.task_summary
		? `/harness-plan "${nextCtx.task_summary}"`
		: '/harness-plan "<task>"';
	persistContext(input.pi, nextCtx);
	return nextCtx;
}

async function maybeHandleClarificationFollowUp(input: {
	pi: ExtensionAPI;
	activeCtx: HarnessRunContext;
	entries: unknown[];
	systemPrompt: string;
}) {
	input.activeCtx.phase = "plan";
	input.activeCtx.last_outcome = "needs_clarification";
	const packet = input.activeCtx.plan_packet_path
		? await readPlanPacketFromPath(input.activeCtx.plan_packet_path)
		: null;
	const planPath = input.activeCtx.plan_packet_path;
	const summary =
		packet && planPath
			? planPacketSummary(packet, planPath, "needs_clarification")
			: null;
	syncPolicyFromPlan(
		input.pi,
		input.entries,
		input.activeCtx.plan_id ?? "plan-pending",
		"plan",
		false,
	);
	persistContext(input.pi, input.activeCtx);
	return {
		systemPrompt: `${input.systemPrompt}\n\n${formatPlanContextBlock(input.activeCtx)}\n\n${formatActivePlanBlock(input.activeCtx, "revise", summary)}\n\nReply with clarification answers; the harness will treat this as plan amend.`,
	};
}

function startFreshPlanAttempt(input: {
	pi: ExtensionAPI;
	activeCtx: HarnessRunContext;
	command: string;
	turn: HarnessTurnEntry | null;
}): void {
	input.activeCtx.plan_ready = false;
	input.activeCtx.phase = "plan";
	input.activeCtx.status = "active";
	input.pi.appendEntry("harness-plan-attempt", {
		run_id: input.activeCtx.run_id,
		command: input.command,
		started_at: input.turn?.invoked_at ?? nowIso(),
	});
}

function contextPrompt(systemPrompt: string, activeCtx: HarnessRunContext) {
	return {
		systemPrompt: `${systemPrompt}\n\n${formatPlanContextBlock(activeCtx)}`,
	};
}

function createNewRunContextForCommand(input: {
	pi: ExtensionAPI;
	activeCtx: HarnessRunContext | null;
	sessionId: string;
	projectRoot: string;
	args: string;
	userPrompt: string;
	systemPrompt: string;
}) {
	if (input.activeCtx?.status === "active") {
		input.activeCtx.status = "aborted";
		input.activeCtx.plan_ready = false;
		input.activeCtx.last_outcome = "abandoned";
		persistContext(input.pi, input.activeCtx);
	}
	const task = extractTaskSummary(input.args, input.userPrompt);
	const activeCtx = createFreshRunContext(
		input.sessionId,
		input.projectRoot,
		task,
	);
	persistContext(input.pi, activeCtx);
	return {
		activeCtx,
		response: {
			systemPrompt: `${input.systemPrompt}\n\n${formatPlanContextBlock(activeCtx)}\n\n${formatActivePlanBlock(activeCtx, "create")}`,
		},
	};
}

async function bindExistingRunForCommand(input: {
	pi: ExtensionAPI;
	sessionId: string;
	projectRoot: string;
	entries: unknown[];
	args: string;
	systemPrompt: string;
}) {
	const parsed = parseHarnessUseRunArgs(input.args);
	if (!parsed.runId) {
		return {
			activeCtx: null,
			response: blockRunContextMessage(
				"Usage: /harness-use-run <run-id> [--claim] [--readonly]",
			),
		};
	}
	const disk = await loadRunContextFromDisk(parsed.runId, input.projectRoot);
	if (!disk) {
		return {
			activeCtx: null,
			response: blockRunContextMessage(
				`No run directory for ${parsed.runId}. Check .pi/harness/runs/.`,
			),
		};
	}
	let activeCtx: HarnessRunContext = {
		...disk,
		pi_session_id: input.sessionId,
		turn_override_run_id: parsed.runId,
	};
	if (parsed.claim) activeCtx = claimRunOwnership(activeCtx, input.sessionId);
	const statuses = await resolveCompletionStatuses(
		input.entries,
		activeCtx.run_id,
		input.projectRoot,
	);
	activeCtx.next_recommended_command =
		activeCtx.owner_pi_session_id !== input.sessionId && !parsed.claim
			? "Read-only: use /harness-use-run <run-id> --claim to take ownership, or /harness-new-run."
			: nextStepAfterOutcome({
					phase: activeCtx.phase,
					planStatus: activeCtx.plan_ready ? "ready" : null,
					lastCompletedStep: activeCtx.last_completed_step,
					lastOutcome: activeCtx.last_outcome,
					executionStatus: statuses.executionStatus,
					evalStatus: statuses.evalStatus,
					adversaryComplete: statuses.adversaryComplete,
					aborted: activeCtx.status === "aborted",
				});
	activeCtx.updated_at = nowIso();
	persistContext(input.pi, activeCtx);
	syncPolicyFromRunContext(input.pi, input.entries, activeCtx);
	return { activeCtx, response: contextPrompt(input.systemPrompt, activeCtx) };
}

type ActiveContextAccess = {
	get(): HarnessRunContext | null;
	set(ctx: HarnessRunContext | null): void;
};

function registerHarnessRunStatusCommand(
	pi: ExtensionAPI,
	active: ActiveContextAccess,
): void {
	pi.registerCommand("harness-run-status", {
		description:
			"Show harness phase, plan readiness, and next command (no run id)",
		handler: async (_args, ctx) => {
			const sessionId = ctx.sessionManager.getSessionId();
			const projectRoot = process.cwd();
			const entries = getEntries(ctx);
			let ctxState = getLatestRunContext(entries) ?? active.get();
			if (!ctxState)
				ctxState = await hydrateFromDisk(sessionId, projectRoot, entries);
			if (!ctxState) {
				const msg = 'No active harness run. Start with /harness-plan "<task>".';
				if (ctx.hasUI) ctx.ui.notify(msg, "warning");
				return;
			}
			let summary: PlanPacketSummary | null = null;
			for (let i = entries.length - 1; i >= 0; i--) {
				const entry = entries[i] as SessionEntryLike;
				if (
					entry.type === "custom" &&
					entry.customType === "harness-plan-packet"
				) {
					summary = entry.data as PlanPacketSummary;
					break;
				}
			}
			const text = [
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
			].join("\n");
			if (ctx.hasUI) ctx.ui.notify(text, "info");
			else
				pi.sendMessage({
					customType: "harness-run-status",
					content: text,
					display: true,
				});
		},
	});
}

function registerHarnessNewRunCommand(
	pi: ExtensionAPI,
	active: ActiveContextAccess,
): void {
	pi.registerCommand("harness-new-run", {
		description: "Abandon current active run and start a fresh harness run",
		handler: async (args, ctx) => {
			const sessionId = ctx.sessionManager.getSessionId();
			const projectRoot = process.cwd();
			const current = active.get();
			if (current?.status === "active") {
				current.status = "aborted";
				current.plan_ready = false;
				persistContext(pi, current);
			}
			const next = createFreshRunContext(
				sessionId,
				projectRoot,
				args.trim() || null,
			);
			active.set(next);
			persistContext(pi, next);
			if (ctx.hasUI) {
				ctx.ui.notify(
					'New harness run allocated. Next: /harness-plan "<your task>"',
					"info",
				);
			}
		},
	});
}

function registerHarnessPlanCommitCommand(
	pi: ExtensionAPI,
	active: ActiveContextAccess,
): void {
	pi.registerCommand("harness-plan-commit", {
		description:
			"Write approved plan-packet.yaml to the active run (requires harness-plan-approval)",
		handler: async (args, ctx) => {
			const projectRoot = process.cwd();
			const entries = getEntries(ctx);
			let runCtx = getLatestRunContext(entries) ?? active.get();
			if (!runCtx) {
				runCtx = await hydrateFromDisk(
					ctx.sessionManager.getSessionId(),
					projectRoot,
					entries,
				);
			}
			if (!runCtx?.plan_packet_path) {
				if (ctx.hasUI)
					ctx.ui.notify(
						"No active harness run. Run /harness-plan first.",
						"warning",
					);
				return;
			}
			if (
				!hasPlanUserApproval(entries, {
					sincePlanCommand: true,
					planId: runCtx.plan_id,
				})
			) {
				if (ctx.hasUI)
					ctx.ui.notify(
						"Plan commit blocked: no user approval recorded. Approve via approve_plan in this session first.",
						"warning",
					);
				return;
			}
			const pathArg = args.trim();
			const packetPath = pathArg || runCtx.plan_packet_path;
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
				await writeFile(target, await readFile(pathArg, "utf-8"), "utf-8");
			}
			runCtx.plan_id = packet.plan_id ?? runCtx.plan_id;
			runCtx.plan_ready = true;
			runCtx.phase = "plan";
			runCtx.last_completed_step = "plan";
			runCtx.last_outcome = "ready";
			runCtx.next_recommended_command = "/harness-run";
			runCtx.updated_at = nowIso();
			active.set(runCtx);
			persistContext(pi, runCtx);
			syncPolicyFromPlan(
				pi,
				entries,
				runCtx.plan_id ?? packet.plan_id ?? "plan-pending",
				"plan",
				true,
			);
			pi.appendEntry(
				"harness-plan-packet",
				planPacketSummary(packet, target, "ready"),
			);
			if (ctx.hasUI) ctx.ui.notify(`Plan committed: ${target}`, "info");
		},
	});
}

function registerHarnessUseRunCommand(
	pi: ExtensionAPI,
	active: ActiveContextAccess,
): void {
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
			let activeCtx: HarnessRunContext = { ...disk, pi_session_id: sessionId };
			if (parsed.claim) activeCtx = claimRunOwnership(activeCtx, sessionId);
			const statuses = await resolveCompletionStatuses(
				getEntries(ctx),
				activeCtx.run_id,
				projectRoot,
			);
			activeCtx.next_recommended_command =
				activeCtx.owner_pi_session_id !== sessionId && !parsed.claim
					? "Read-only: use /harness-use-run <run-id> --claim to take ownership."
					: nextStepAfterOutcome({
							phase: activeCtx.phase,
							planStatus: activeCtx.plan_ready ? "ready" : null,
							lastCompletedStep: activeCtx.last_completed_step,
							lastOutcome: activeCtx.last_outcome,
							executionStatus: statuses.executionStatus,
							evalStatus: statuses.evalStatus,
							adversaryComplete: statuses.adversaryComplete,
							aborted: activeCtx.status === "aborted",
						});
			activeCtx.updated_at = nowIso();
			active.set(activeCtx);
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

async function readPlanSpawnState(activeCtx: HarnessRunContext): Promise<{
	planSummary: PlanPacketSummary | null;
	planPacketForSpawn: Awaited<ReturnType<typeof readPlanPacketFromPath>>;
}> {
	let planSummary: PlanPacketSummary | null = null;
	let planPacketForSpawn: Awaited<ReturnType<typeof readPlanPacketFromPath>> =
		null;
	if (!activeCtx.plan_packet_path) return { planSummary, planPacketForSpawn };
	planPacketForSpawn = await readPlanPacketFromPath(activeCtx.plan_packet_path);
	if (planPacketForSpawn) {
		planSummary = planPacketSummary(
			planPacketForSpawn,
			activeCtx.plan_packet_path,
			activeCtx.plan_ready ? "ready" : "draft",
		);
		activeCtx.plan_id = planPacketForSpawn.plan_id ?? activeCtx.plan_id;
	}
	return { planSummary, planPacketForSpawn };
}

function buildSpawnPromptBlocks(input: {
	command: string;
	activeCtx: HarnessRunContext;
	planSummary: PlanPacketSummary | null;
	planPacketForSpawn: Awaited<ReturnType<typeof readPlanPacketFromPath>>;
}): {
	activePlanBlock: string;
	planMode: "create" | "revise" | null;
	contextSpawnOpts: Parameters<typeof formatPlanContextBlock>[1] | undefined;
} {
	let activePlanBlock = "";
	let planMode: "create" | "revise" | null = null;
	let contextSpawnOpts:
		| Parameters<typeof formatPlanContextBlock>[1]
		| undefined;
	if (input.command === "harness-run" && input.planPacketForSpawn) {
		contextSpawnOpts = {
			mode: "execute",
			critical_path_work_item_ids: criticalPathWorkItemIdsFromPlanPacket(
				input.planPacketForSpawn,
			),
		};
	}
	if (input.command === "harness-plan" || input.command === "harness-auto") {
		planMode =
			input.activeCtx.plan_id ||
			input.activeCtx.plan_packet_path ||
			input.activeCtx.status === "aborted"
				? "revise"
				: "create";
		activePlanBlock = formatActivePlanBlock(
			input.activeCtx,
			planMode,
			input.planSummary,
		);
	} else if (input.command === "harness-run") {
		activePlanBlock = formatActivePlanBlock(
			input.activeCtx,
			"execute",
			input.planSummary,
		);
	} else if (input.command === "harness-steer") {
		activePlanBlock = formatActivePlanBlock(
			input.activeCtx,
			"execute",
			input.planSummary,
		);
		contextSpawnOpts = {
			mode: "repair",
			repair_brief_path: "artifacts/repair-brief.yaml",
		};
	} else if (
		["harness-eval", "harness-review", "harness-critic"].includes(input.command)
	) {
		activePlanBlock = formatActivePlanBlock(
			input.activeCtx,
			"read",
			input.planSummary,
		);
	}
	return { activePlanBlock, planMode, contextSpawnOpts };
}

async function archivePlanRevisionIfNeeded(input: {
	pi: ExtensionAPI;
	command: string;
	planMode: "create" | "revise" | null;
	activeCtx: HarnessRunContext;
	projectRoot: string;
	userPrompt: string;
}): Promise<void> {
	if (input.command !== "harness-plan" && input.command !== "harness-auto")
		return;
	const reviewOutcome = await readReviewOutcomeFromRun(
		input.activeCtx.run_id,
		input.projectRoot,
	);
	if (
		!shouldArchiveForPlanRevise({
			command: input.command,
			mode: input.planMode,
			runCtx: input.activeCtx,
			reviewOutcome,
			userPrompt: input.userPrompt,
		})
	)
		return;
	const reset = await archivePlanRevisionArtifacts({
		projectRoot: input.projectRoot,
		runId: input.activeCtx.run_id,
		reason: "review_plan_gap_revise",
	});
	if (reset.moved.length === 0) return;
	input.pi.appendEntry("harness-plan-revision-reset", {
		run_id: input.activeCtx.run_id,
		archive_dir: reset.archiveDir,
		moved: reset.moved,
		reason: "review_plan_gap_revise",
		recorded_at: nowIso(),
	});
}

function latestParsedHarnessCommand(entries: unknown[]) {
	const userEntries = entries.filter((e) => {
		const entry = e as { type?: string; message?: { role?: string } };
		return entry.type === "message" && entry.message?.role === "user";
	});
	const lastUser = userEntries[userEntries.length - 1] as
		| { message?: { content?: string | unknown[] } }
		| undefined;
	const lastPrompt =
		typeof lastUser?.message?.content === "string"
			? lastUser.message.content
			: "";
	const lastTurn = getLatestHarnessTurn(entries);
	return lastTurn
		? { command: lastTurn.command, args: lastTurn.args }
		: parseHarnessSlashInput(userVisiblePromptSlice(lastPrompt));
}

function handleAgentEndAbort(input: {
	pi: ExtensionAPI;
	ctx: { hasUI: boolean; ui: { notify(message: string, type?: string): void } };
	activeCtx: HarnessRunContext;
}): void {
	input.activeCtx.status = "aborted";
	input.activeCtx.plan_ready = false;
	input.activeCtx.last_outcome = "aborted";
	input.activeCtx.last_completed_step = "abort";
	input.activeCtx.next_recommended_command = input.activeCtx.task_summary
		? `/harness-plan "${input.activeCtx.task_summary}"`
		: '/harness-plan "<task>"';
	persistContext(input.pi, input.activeCtx);
	const msg = `Harness aborted. Next: ${input.activeCtx.next_recommended_command}`;
	if (input.ctx.hasUI) input.ctx.ui.notify(msg, "warning");
	else
		input.pi.sendMessage({
			customType: "harness-step-handoff",
			content: msg,
			display: true,
		});
}

async function updatePlanReadinessAfterAgent(input: {
	pi: ExtensionAPI;
	ctx: { hasUI: boolean; ui: { notify(message: string, type?: string): void } };
	entries: unknown[];
	parsed: { command: string; args: string } | null;
	activeCtx: HarnessRunContext;
}): Promise<void> {
	if (
		input.parsed?.command !== "harness-plan" &&
		input.parsed?.command !== "harness-auto"
	)
		return;
	if (!input.activeCtx.plan_packet_path) return;
	const packet = await readPlanPacketFromPath(input.activeCtx.plan_packet_path);
	const validation = validatePlanPacket(packet);
	const approved = hasPlanUserApproval(input.entries, {
		sincePlanCommand: true,
		planId: packet?.plan_id ?? null,
	});
	input.activeCtx.plan_ready = validation.valid && approved;
	if (validation.valid && !approved) {
		input.activeCtx.last_outcome = "needs_clarification";
		input.activeCtx.last_completed_step = "plan";
		const msg =
			"Plan file exists but user approval was not recorded. Planner must call approve_plan (or bridged ask_user Approve) before writing plan-packet.yaml.";
		if (input.ctx.hasUI) input.ctx.ui.notify(msg, "warning");
		else
			input.pi.sendMessage({
				customType: "harness-plan-packet",
				content: msg,
				display: true,
			});
	} else if (input.activeCtx.plan_ready && packet?.plan_id) {
		input.activeCtx.plan_id = packet.plan_id;
		syncPolicyFromPlan(input.pi, input.entries, packet.plan_id, "plan", true);
		const summary = planPacketSummary(packet, input.activeCtx.plan_packet_path);
		input.pi.appendEntry("harness-plan-packet", summary);
		input.activeCtx.last_completed_step = "plan";
		input.activeCtx.last_outcome = summary.plan_status;
	} else if (!validation.valid) {
		input.activeCtx.last_outcome = "needs_clarification";
		input.activeCtx.last_completed_step = "plan";
	}
}

function registerPlanApprovalCapture(
	pi: ExtensionAPI,
	active: ActiveContextAccess,
): void {
	pi.on("tool_result", async (event, ctx) => {
		if (event.isError) return;
		if (event.toolName !== "ask_user" && event.toolName !== "approve_plan")
			return;
		const approval = parsePlanApprovalFromMessage({
			toolName: event.toolName,
			details: event.details,
			content: event.content,
		});
		if (!approval) return;
		const entries = getEntries(ctx);
		const runCtx = getLatestRunContext(entries) ?? active.get();
		if (!runCtx) return;
		pi.appendEntry("harness-plan-approval", {
			plan_id: approval.plan_id ?? runCtx.plan_id,
			approved_at: approval.approved_at,
			source: approval.source,
		});
	});
}

async function guardToolCall(input: {
	event: { toolName: string; input: unknown };
	ctx: { sessionManager: { getEntries(): unknown[] } };
	activeCtx: HarnessRunContext | null;
}) {
	if (isSubmitToolName(input.event.toolName)) {
		const decision = evaluateHarnessSubagentToolCall(
			input.event.toolName,
			input.event.input as Record<string, unknown>,
			"parent-orchestrator",
		);
		if (decision.action === "block")
			return { block: true, reason: decision.reason };
	}
	if (input.event.toolName === "write") {
		const entries = getEntries(input.ctx);
		const runCtx = getLatestRunContext(entries) ?? input.activeCtx;
		if (runCtx) {
			const blocked = await coerceScopedHarnessYamlWrite(
				input.event as { toolName: string; input: Record<string, unknown> },
				runCtx,
				process.cwd(),
			);
			if (blocked) return blocked;
		}
	}
	const activeCtx = input.activeCtx;
	if (activeCtx?.plan_packet_path) {
		const entries = getEntries(input.ctx);
		if (hasPlanUserApproval(entries, { sincePlanCommand: true })) {
			if (input.event.toolName === "approve_plan") {
				return {
					block: true,
					reason:
						"harness-run-context: plan already approved via planner subagent; do not call approve_plan again in the parent session.",
				};
			}
			if (input.event.toolName === "ask_user") {
				const askInput = input.event.input as {
					question?: string;
					options?: unknown[];
				};
				if (isPlanApprovalAskUser(askInput)) {
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
	if (input.event.toolName !== "write" && input.event.toolName !== "edit")
		return undefined;
	const target = String(
		(input.event.input as { path?: string; filePath?: string }).path ??
			(input.event.input as { filePath?: string }).filePath ??
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
}

function registerHarnessToolCallGuards(
	pi: ExtensionAPI,
	active: ActiveContextAccess,
): void {
	pi.on("tool_call", async (event, ctx) =>
		guardToolCall({ event, ctx, activeCtx: active.get() }),
	);
}

async function resolveCommandRunContext(input: {
	pi: ExtensionAPI;
	activeCtx: HarnessRunContext | null;
	command: string;
	args: string;
	userPrompt: string;
	sessionId: string;
	projectRoot: string;
	turn: HarnessTurnEntry | null;
}) {
	let activeCtx = input.activeCtx;
	const resolved = resolveArgsForCommand(input.command, input.args, activeCtx);
	if (resolved.overrideRun && resolved.runId) {
		const disk = await loadRunContextFromDisk(
			resolved.runId,
			input.projectRoot,
		);
		if (disk) activeCtx = { ...disk, turn_override_run_id: resolved.runId };
	}
	if (
		input.command === "harness-plan" ||
		input.command === "harness-auto" ||
		(!activeCtx && input.command !== "harness-abort")
	) {
		if (
			!activeCtx ||
			!shouldReuseHarnessRunId(input.userPrompt, activeCtx, input.command)
		) {
			activeCtx = createFreshRunContext(
				input.sessionId,
				input.projectRoot,
				extractTaskSummary(input.args, input.userPrompt),
			);
		}
		if (input.command === "harness-plan") {
			const task = extractTaskSummary(input.args, input.userPrompt);
			if (task) activeCtx.task_summary = task;
		}
		startFreshPlanAttempt({
			pi: input.pi,
			activeCtx,
			command: input.command,
			turn: input.turn,
		});
	} else if (
		activeCtx &&
		shouldReuseHarnessRunId(input.userPrompt, activeCtx, input.command)
	) {
		activeCtx.turn_override_run_id = resolved.overrideRun
			? resolved.runId
			: null;
	} else if (!activeCtx) {
		const pointer = await loadProjectActiveRun(input.projectRoot);
		if (pointer && isStaleActiveRunPointer(pointer, input.projectRoot)) {
			const crossSessionCmd = new Set([
				"harness-eval",
				"harness-review",
				"harness-steer",
				"harness-critic",
				"harness-trace",
				"harness-incident",
			]);
			if (crossSessionCmd.has(input.command)) {
				return {
					activeCtx,
					resolved,
					response: blockRunContextMessage(
						'Project active-run pointer is stale or from another workspace. Run /harness-plan "<task>" or /harness-use-run <run-id> for recovery.',
					),
				};
			}
		} else if (pointer) {
			const disk = await loadRunContextFromDisk(
				pointer.run_id,
				input.projectRoot,
			);
			if (disk) activeCtx = disk;
		}
	}
	return { activeCtx, resolved, response: null };
}

async function handleBeforeAgentStart(input: {
	pi: ExtensionAPI;
	event: any;
	ctx: any;
	active: ActiveContextAccess;
}) {
	const sessionId = input.ctx.sessionManager.getSessionId();
	const projectRoot = process.cwd();
	const entries = getEntries(input.ctx);
	const userPrompt = userVisiblePromptSlice(input.event.prompt);
	const turn = getLatestHarnessTurn(entries);
	const parsed = turn
		? { command: turn.command, args: turn.args }
		: parseHarnessSlashInput(userPrompt);
	const harnessTurn =
		Boolean(turn) ||
		Boolean(parsed) ||
		needsClarificationFollowUp(input.active.get());
	let activeCtx = await applyAbortSignal({
		pi: input.pi,
		activeCtx: input.active.get(),
		sessionId,
		projectRoot,
		entries,
		userPrompt,
	});
	input.active.set(activeCtx);
	if (!harnessTurn) return undefined;
	if (!activeCtx) {
		activeCtx = await hydrateFromDisk(sessionId, projectRoot, entries);
		input.active.set(activeCtx);
	}
	const policyPhase =
		inferHarnessPhase(entries, userPrompt) ??
		getLatestPolicyPhase(entries) ??
		activeCtx?.phase ??
		"plan";
	const driftActive = driftGateActive(entries);
	if (!parsed && needsClarificationFollowUp(activeCtx) && activeCtx) {
		return maybeHandleClarificationFollowUp({
			pi: input.pi,
			activeCtx,
			entries,
			systemPrompt: input.event.systemPrompt,
		});
	}
	if (!parsed) return undefined;
	const { command, args } = parsed;
	if (
		!isHarnessBootstrapPrompt(userPrompt) &&
		!hasHarnessAbortSignal(userPrompt)
	) {
		const policyBlock = getPolicyTransitionBlock(userPrompt, entries);
		if (policyBlock.blocked) {
			return blockRunContextMessage(
				policyBlock.message ?? "Harness command blocked by policy phase.",
			);
		}
	}
	if (command === "harness-new-run") {
		const next = createNewRunContextForCommand({
			pi: input.pi,
			activeCtx,
			sessionId,
			projectRoot,
			args,
			userPrompt,
			systemPrompt: input.event.systemPrompt,
		});
		input.active.set(next.activeCtx);
		return next.response;
	}
	if (command === "harness-use-run") {
		const next = await bindExistingRunForCommand({
			pi: input.pi,
			sessionId,
			projectRoot,
			entries,
			args,
			systemPrompt: input.event.systemPrompt,
		});
		if (next.activeCtx) input.active.set(next.activeCtx);
		return next.response;
	}
	if (command === "harness-run-status") return undefined;
	if (
		command === "harness-plan" &&
		activeCtx &&
		isNewTaskPlanBlocked(activeCtx, userPrompt) &&
		!isAmendPlanAllowed(activeCtx, userPrompt, driftActive)
	) {
		return blockRunContextMessage(
			"Active harness run in progress. Use /harness-abort or /harness-new-run before starting a new task plan.",
		);
	}
	const prepared = await resolveCommandRunContext({
		pi: input.pi,
		activeCtx,
		command,
		args,
		userPrompt,
		sessionId,
		projectRoot,
		turn,
	});
	activeCtx = prepared.activeCtx;
	const { resolved } = prepared;
	if (prepared.response) return prepared.response;
	if (!activeCtx)
		return blockRunContextMessage(
			'No active harness run. Run /harness-plan "<task>" first, or /harness-use-run <run-id> for recovery.',
		);
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
		if (!check.ok)
			return blockRunContextMessage(check.reason ?? "Invalid --plan override");
		activeCtx.plan_packet_path = resolved.planPath;
	}
	if (command === "harness-run" && !activeCtx.plan_ready)
		return blockRunContextMessage("Plan not ready. Run /harness-plan first.");
	if (
		command === "harness-run" &&
		activeCtx.plan_ready &&
		activeCtx.last_completed_step === "execute" &&
		activeCtx.last_outcome === "completed"
	) {
		return blockRunContextMessage(
			"Execute already completed for this run. Next: /harness-review (same session), or /harness-abort to replan.",
		);
	}
	const { planSummary, planPacketForSpawn } =
		await readPlanSpawnState(activeCtx);
	const { activePlanBlock, planMode, contextSpawnOpts } =
		buildSpawnPromptBlocks({
			command,
			activeCtx,
			planSummary,
			planPacketForSpawn,
		});
	await archivePlanRevisionIfNeeded({
		pi: input.pi,
		command,
		planMode,
		activeCtx,
		projectRoot,
		userPrompt,
	});
	input.active.set(activeCtx);
	persistContext(input.pi, activeCtx);
	return {
		systemPrompt: `${input.event.systemPrompt}\n\n${formatPlanContextBlock(activeCtx, contextSpawnOpts)}${activePlanBlock ? `\n\n${activePlanBlock}` : ""}`,
	};
}

async function handleAgentEnd(input: {
	pi: ExtensionAPI;
	ctx: any;
	active: ActiveContextAccess;
}): Promise<void> {
	const projectRoot = process.cwd();
	const entries = getEntries(input.ctx);
	const activeCtx = input.active.get() ?? getLatestRunContext(entries);
	if (!activeCtx) return;
	input.active.set(activeCtx);
	const parsed = latestParsedHarnessCommand(entries);
	if (!parsed && !needsClarificationFollowUp(activeCtx)) return;
	if (parsed?.command === "harness-abort") {
		handleAgentEndAbort({ pi: input.pi, ctx: input.ctx, activeCtx });
		return;
	}
	await updatePlanReadinessAfterAgent({
		pi: input.pi,
		ctx: input.ctx,
		entries,
		parsed,
		activeCtx,
	});
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
		syncPolicyFromRunContext(input.pi, entries, activeCtx);
	}
	if (
		["harness-eval", "harness-review", "harness-critic"].includes(
			parsed?.command ?? "",
		)
	) {
		activeCtx.last_completed_step =
			parsed?.command === "harness-critic" ? "adversary" : "review";
		if (statuses.evalStatus) activeCtx.last_outcome = statuses.evalStatus;
		if (statuses.adversaryComplete) {
			activeCtx.phase = "adversary";
			activeCtx.last_completed_step = "adversary";
		} else if (statuses.evalStatus) activeCtx.phase = "evaluate";
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
		steerMaxAttempts: activeCtx.steer_max_attempts ?? steerMaxAttemptsFromEnv(),
		reviewComplete,
	});
	activeCtx.next_recommended_command = next;
	activeCtx.updated_at = new Date().toISOString();
	if (
		parsed?.command === "harness-run" &&
		activeCtx.last_outcome === "completed"
	) {
		syncPolicyFromRunContext(input.pi, entries, activeCtx);
	}
	persistContext(input.pi, activeCtx);
	input.pi.appendEntry("harness-step-handoff", {
		next_command: next,
		plan_status: statuses.planStatus,
		execution_status: statuses.executionStatus,
		eval_status: statuses.evalStatus,
		phase: activeCtx.phase,
	});
	if (next && parsed) {
		const notify = `Next: ${next}`;
		if (input.ctx.hasUI) input.ctx.ui.notify(notify, "info");
		else
			input.pi.sendMessage({
				customType: "harness-step-handoff",
				content: notify,
				display: true,
			});
	}
}

export default function harnessRunContext(pi: ExtensionAPI) {
	if (!claimHarnessGovernanceLoad("harness-run-context", MODULE_URL)) return;
	let activeCtx: HarnessRunContext | null = null;
	const activeAccess: ActiveContextAccess = {
		get: () => activeCtx,
		set: (ctx) => {
			activeCtx = ctx;
		},
	};

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

	pi.on("before_agent_start", async (event, ctx) =>
		handleBeforeAgentStart({ pi, event, ctx, active: activeAccess }),
	);

	pi.on("agent_end", async (_event, ctx) => {
		await handleAgentEnd({ pi, ctx, active: activeAccess });
	});

	registerPlanApprovalCapture(pi, activeAccess);
	registerHarnessToolCallGuards(pi, activeAccess);
	registerHarnessRunStatusCommand(pi, activeAccess);
	registerHarnessNewRunCommand(pi, activeAccess);

	registerHarnessPlanCommitCommand(pi, activeAccess);

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
							text: `Path not allowed: ${pathArg}. Post-run verdicts must be written via submit_* in harness/reviewing/evaluator or harness/reviewing/adversary subagents; parent gates with harness_artifact_ready only.`,
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

	registerHarnessUseRunCommand(pi, activeAccess);
}
