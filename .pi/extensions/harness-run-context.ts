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
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { allowsAgentTool } from "../lib/agents-policy.mjs";
import {
	disarmHarnessKillSwitch,
	resetHarnessPolicyDenyCount,
} from "../lib/agt/kill-switch-state.js";
import { runAskUser } from "../lib/ask-user/index.js";
import { isHarnessNonInteractive } from "../lib/ask-user/policy.js";
import { claimHarnessGovernanceLoad } from "../lib/extension-load-guard.js";
import {
	executePostWorkEnabled,
	formatExecutorHandoffBrief,
	runExecutePostWork,
} from "../lib/harness-execute-postwork.js";
import {
	ensureHarnessGitBranch,
	writeGitWorkflowArtifact,
} from "../lib/harness-git-branch.mjs";
import { getHarnessPackageRoot } from "../lib/harness-paths.js";
import {
	buildPhaseCompletedPayload,
	phaseTerminalArtifact,
} from "../lib/harness-phase-telemetry.js";
import { captureHarnessEvent } from "../lib/harness-posthog.js";
import { steerBurstAllowed } from "../lib/harness-remediation.js";
import {
	blockingHarnessAutoCommandReason,
	blockingReviewCommandReason,
	blockingRunCommandReason,
	blockingSteerCommandReason,
	buildHarnessClearManifest,
	claimRunOwnership,
	createFreshRunContext,
	criticalPathWorkItemIdsFromPlanPacket,
	deleteProjectActiveRun,
	driftGateActive,
	ensureReviewOutcomeFromEval,
	evaluateCrossSessionResume,
	extractWritePathFromToolInput,
	findActiveRunOwnershipConflict,
	formatActivePlanBlock,
	formatCrossSessionResumeMessage,
	formatPlanContextBlock,
	getLatestHarnessTurn,
	getLatestPolicyPhase,
	getLatestRunContext,
	getPolicyTransitionBlock,
	type HarnessRunContext,
	type HarnessTurnEntry,
	harnessAutoTasksDiffer,
	hasConfirmedClearAfterLatestRunContext,
	hasHarnessAbortSignal,
	hasPlanUserApproval,
	indexOfLastPlanCommand,
	inferHarnessPhase,
	invalidateEvalVerdictAfterRepair,
	isAmendPlanAllowed,
	isHarnessBootstrapPrompt,
	isNewTaskPlanBlocked,
	isPlanApprovalAskUser,
	isPlanPhaseScopedWrite,
	isStaleActiveRunPointer,
	isSteerBurstArgs,
	loadProjectActiveRun,
	loadRunContextFromDisk,
	nextStepAfterOutcome,
	normalizeHarnessPath,
	nowIso,
	type PlanPacketSummary,
	parseArgFlag,
	parseHarnessSlashInput,
	parseHarnessUseRunArgs,
	parsePlanApprovalFromMessage,
	planPacketSummary,
	readAdversaryReportFromRun,
	readEvalVerdictFromRun,
	readExecutorHandoffFromRun,
	readPlanPacketFromPath,
	readRepairBriefFromRun,
	readReviewOutcomeFromRun,
	reconcileReviewRouting,
	reconcileStaleExecuteCompletion,
	refreshRunContextProgress,
	releaseForeignQaRunOwnership,
	relPathUnderActiveRun,
	resetRunContextForHarnessAuto,
	resolveArgsForCommand,
	resolveCompletionStatuses,
	resolveHarnessRunPostAgentState,
	resolveHarnessRunWriteTarget,
	resolveRemediationClassForRun,
	resolveSteerEntryEffects,
	saveProjectActiveRun,
	saveRunContextToDisk,
	sessionHasResumePromptForRun,
	shouldAutoClaimHarnessRun,
	shouldReuseHarnessRunId,
	steerMaxAttemptsFromEnv,
	syncPlanLastOutcomeFromTaskClarification,
	syncPlanReadyFromDisk,
	updateSteerStateOnEntry,
	userVisiblePromptSlice,
	validatePlanOverridePath,
	validatePlanPacket,
} from "../lib/harness-run-context.js";
import { blockRunContextMessage } from "../lib/harness-run-context-responses.js";
import { isSubmitToolName } from "../lib/harness-subagent-submit-registry.js";
import { bootstrapHarnessSubprocessFromEnv } from "../lib/harness-subprocess-bootstrap.js";
import {
	normalizeHarnessYamlContent,
	parseStructuredDocument,
	writeYamlFile,
} from "../lib/harness-yaml.js";
import { isReviewRoundArtifactPath } from "../lib/plan-debate-gate.js";
import { isReviewRoundYamlWriteAllowed } from "../lib/plan-debate-write-guard.js";
import {
	endHeadlessHarnessPrintSession,
	maybeForceHeadlessPlanProgress,
	maybeHeadlessGitQaFinalizeOnRun,
	maybeHeadlessQaAutoExecuteSmoke,
	seedHeadlessTaskClarificationIfNeeded,
	shouldEndHeadlessHarnessPrintSession,
	tryHeadlessAutoPlanFinalize,
} from "../lib/plan-headless-ux.js";
import {
	formatPlanHumanGateBlock,
	resolvePlanHumanGateStatus,
	validateTaskClarificationHumanGate,
} from "../lib/plan-human-gates.js";
import {
	assertTaskClarificationReadyForPlanWrite,
	readTaskClarificationDoc,
	TASK_CLARIFICATION_ARTIFACT,
} from "../lib/plan-task-clarification.js";

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
	void saveRunContextToDisk(ctx).catch((err) => {
		pi.appendEntry("harness-run-context-disk-error", {
			run_id: ctx.run_id,
			error: err instanceof Error ? err.message : String(err),
			recorded_at: nowIso(),
		});
	});
	void saveProjectActiveRun(ctx).catch((err) => {
		pi.appendEntry("harness-run-context-disk-error", {
			run_id: ctx.run_id,
			error: err instanceof Error ? err.message : String(err),
			recorded_at: nowIso(),
		});
	});
	pi.events.emit("harness-run-context:updated", { run_id: ctx.run_id });
}

function notifyHarnessHandoff(
	ctx: { hasUI: boolean; ui: { notify(message: string, type?: string): void } },
	message: string,
	level: "info" | "warning" = "info",
): void {
	if (ctx.hasUI) ctx.ui.notify(message, level);
	// Headless (-p/json): appendEntry records handoff; never inject user-visible messages.
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
	"ls-lint-manifest-proposal.yaml",
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

/** Exported for tests — avoid archiving on every /harness-plan continue. */
export function shouldArchiveForPlanRevise(input: {
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
	const prompt = input.userPrompt.toLowerCase();
	const explicitRevise =
		prompt.includes("--mode revise") ||
		prompt.includes("--mode=revise") ||
		prompt.includes("mode: revise") ||
		/\b(revise\s+(the\s+)?plan|reset\s+plan|start\s+over\s+on\s+the\s+plan)\b/.test(
			prompt,
		);
	if (explicitRevise) return true;
	if (input.reviewOutcome?.remediation_class !== "plan_gap") return false;
	return (
		prompt.includes("plan_gap") ||
		prompt.includes("remediation_class") ||
		/\brevise\s+per\s+review\b/.test(prompt)
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
	_sessionId: string,
	projectRoot: string,
	entries: unknown[],
): Promise<HarnessRunContext | null> {
	const fromSession = getLatestRunContext(entries);
	if (fromSession) {
		return reconcileStaleExecuteCompletion(projectRoot, fromSession, entries);
	}
	if (hasConfirmedClearAfterLatestRunContext(entries)) return null;

	const pointer = await loadProjectActiveRun(projectRoot);
	if (!pointer || isStaleActiveRunPointer(pointer, projectRoot)) return null;

	const disk = await loadRunContextFromDisk(pointer.run_id, projectRoot);
	if (!disk) return null;
	const clar = await syncPlanLastOutcomeFromTaskClarification(
		projectRoot,
		disk,
	);
	const planSynced = await syncPlanReadyFromDisk(projectRoot, clar, entries);
	return reconcileStaleExecuteCompletion(projectRoot, planSynced, entries);
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
	const info = await evaluateCrossSessionResume(projectRoot, getEntries(ctx));
	if (!info) return;
	const entriesAfter = getEntries(ctx);
	if (
		sessionHasResumePromptForRun(entriesAfter, info.runId) ||
		!(await evaluateCrossSessionResume(projectRoot, entriesAfter))
	) {
		return;
	}

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
	if (!hasHarnessAbortSignal(input.userPrompt)) {
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

function appendAbortPolicyState(
	pi: ExtensionAPI,
	reason: string,
	abortedAt: string,
): void {
	pi.appendEntry("harness-policy-state", {
		phase: "plan",
		approvedPlan: false,
		planId: null,
		budgetBypass: false,
		aborted: true,
		abortReason: reason,
		abortedAt,
		updatedAt: abortedAt,
	});
}

function abortActiveRunContext(input: {
	pi: ExtensionAPI;
	activeCtx: HarnessRunContext;
	reason: string;
}): HarnessRunContext {
	const abortedAt = nowIso();
	input.activeCtx.phase = "plan";
	input.activeCtx.status = "aborted";
	input.activeCtx.plan_ready = false;
	input.activeCtx.last_outcome = "aborted";
	input.activeCtx.last_completed_step = "abort";
	input.activeCtx.next_recommended_command = input.activeCtx.task_summary
		? `/harness-plan "${input.activeCtx.task_summary}"`
		: '/harness-plan "<task>"';
	input.activeCtx.updated_at = abortedAt;
	appendAbortPolicyState(input.pi, input.reason, abortedAt);
	persistContext(input.pi, input.activeCtx);
	return input.activeCtx;
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
	const amendHint = packet
		? "Reply with clarification answers; the harness will treat this as plan amend."
		: `Reply with clarification answers; the harness will merge them into ${TASK_CLARIFICATION_ARTIFACT} and continue Phase 0 (task contract), not full planning yet.`;
	const planBlock = packet
		? formatActivePlanBlock(input.activeCtx, "revise", summary)
		: `[HarnessTaskClarification] status=needs_user — complete ${TASK_CLARIFICATION_ARTIFACT} before reconnaissance.`;
	return {
		systemPrompt: `${input.systemPrompt}\n\n${formatPlanContextBlock(input.activeCtx)}\n\n${planBlock}\n\n${amendHint}`,
	};
}

function startFreshPlanAttempt(input: {
	pi: ExtensionAPI;
	activeCtx: HarnessRunContext;
	command: string;
	turn: HarnessTurnEntry | null;
	sessionId: string;
}): void {
	input.activeCtx.plan_ready = false;
	input.activeCtx.phase = "plan";
	input.activeCtx.status = "active";
	disarmHarnessKillSwitch(input.sessionId);
	resetHarnessPolicyDenyCount(input.sessionId);
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

async function createNewRunContextForCommand(input: {
	pi: ExtensionAPI;
	activeCtx: HarnessRunContext | null;
	sessionId: string;
	projectRoot: string;
	args: string;
	userPrompt: string;
	systemPrompt: string;
}) {
	const ownershipConflict = await findActiveRunOwnershipConflict(
		input.projectRoot,
		input.sessionId,
	);
	if (ownershipConflict) {
		return {
			activeCtx: input.activeCtx,
			response: blockRunContextMessage(
				`Another Pi session (${ownershipConflict.ownerPiSessionId}) owns active run ${ownershipConflict.runId}. Finish or abort that run before /harness-new-run.`,
			),
		};
	}
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

const HARNESS_CLEAR_CONFIRM_OPTION = "Delete all harness runs";

function isHarnessClearConfirmed(response: unknown): boolean {
	if (!response || typeof response !== "object") return false;
	const payload = response as {
		kind?: string;
		selections?: unknown;
	};
	if (payload.kind !== "selection" || !Array.isArray(payload.selections)) {
		return false;
	}
	return (
		payload.selections.length === 1 &&
		payload.selections[0] === HARNESS_CLEAR_CONFIRM_OPTION
	);
}

function registerHarnessClearCommand(
	pi: ExtensionAPI,
	active: ActiveContextAccess,
): void {
	pi.registerCommand("harness-clear", {
		description:
			"Delete all harness runs under .pi/harness/runs, including the active run",
		handler: async (_args, ctx) => {
			const entries = getEntries(ctx);
			const projectRoot = process.cwd();
			const latest = active.get() ?? getLatestRunContext(entries);
			const pointer = await loadProjectActiveRun(projectRoot);
			const activeRunIds = [
				...new Set(
					[latest?.run_id, pointer?.run_id].filter(Boolean) as string[],
				),
			].sort();
			const manifest = await buildHarnessClearManifest(projectRoot);
			const hasTargets =
				manifest.candidates.length > 0 || activeRunIds.length > 0;
			if (!hasTargets) {
				const message = [
					"/harness-clear: no harness runs found.",
					`  skipped: ${manifest.skipped.length}`,
				].join("\n");
				if (ctx.hasUI) ctx.ui.notify(message, "info");
				else
					pi.sendMessage({
						customType: "harness-clear-result",
						content: message,
						display: true,
					});
				pi.appendEntry("harness-clear-result", {
					approved: false,
					cleared_all: false,
					deleted: 0,
					active_cleared: false,
					active_run_ids: activeRunIds,
					skipped: manifest.skipped,
					recorded_at: nowIso(),
				});
				return;
			}
			const ask = await runAskUser(
				{
					question: `Delete all ${manifest.candidates.length} harness run directories, including the current run?`,
					context: [
						"Scope: .pi/harness/runs/<run_id> directories plus .pi/harness/active-run.json.",
						"The in-session active run context will also be cleared.",
						`Active run ids: ${activeRunIds.join(", ") || "(none)"}`,
						`Candidates: ${manifest.candidates.map((item) => item.run_id).join(", ") || "(none)"}`,
					].join("\n"),
					options: [HARNESS_CLEAR_CONFIRM_OPTION, "Cancel"],
					allowSkip: true,
				},
				{ ui: ctx.ui, hasUI: ctx.hasUI },
			);
			if ("error" in ask) {
				const message = [
					"/harness-clear: confirmation unavailable; no files deleted (fail-closed).",
					`  reason: ${ask.error}`,
				].join("\n");
				if (ctx.hasUI) ctx.ui.notify(message, "warning");
				else
					pi.sendMessage({
						customType: "harness-clear-result",
						content: message,
						display: true,
					});
				pi.appendEntry("harness-clear-result", {
					approved: false,
					cleared_all: false,
					deleted: 0,
					active_cleared: false,
					active_run_ids: activeRunIds,
					skipped: manifest.skipped,
					ask_error: ask.error,
					recorded_at: nowIso(),
				});
				return;
			}
			const confirmed =
				!ask.details.cancelled && isHarnessClearConfirmed(ask.details.response);
			if (!confirmed) {
				const message = [
					"/harness-clear: cancelled; no files deleted.",
					`  candidates: ${manifest.candidates.length}`,
				].join("\n");
				if (ctx.hasUI) ctx.ui.notify(message, "info");
				else
					pi.sendMessage({
						customType: "harness-clear-result",
						content: message,
						display: true,
					});
				pi.appendEntry("harness-clear-result", {
					approved: false,
					cleared_all: false,
					deleted: 0,
					active_cleared: false,
					active_run_ids: activeRunIds,
					skipped: manifest.skipped,
					recorded_at: nowIso(),
				});
				return;
			}
			let deleted = 0;
			const failed: Array<{ run_id: string; reason: string }> = [];
			for (const candidate of manifest.candidates) {
				try {
					await rm(candidate.canonical_path, { recursive: true, force: true });
					deleted += 1;
				} catch (err) {
					failed.push({
						run_id: candidate.run_id,
						reason: err instanceof Error ? err.message : String(err),
					});
				}
			}
			const activePointerDeleted = await deleteProjectActiveRun(projectRoot);
			active.set(null);
			const message = [
				"/harness-clear complete.",
				`  deleted: ${deleted}`,
				`  active_cleared: true`,
				`  active_pointer_deleted: ${activePointerDeleted}`,
				`  skipped: ${manifest.skipped.length + failed.length}`,
			].join("\n");
			if (ctx.hasUI) ctx.ui.notify(message, "info");
			else
				pi.sendMessage({
					customType: "harness-clear-result",
					content: message,
					display: true,
				});
			pi.appendEntry("harness-clear-result", {
				approved: true,
				cleared_all: failed.length === 0,
				deleted,
				active_cleared: true,
				active_pointer_deleted: activePointerDeleted,
				active_run_ids: activeRunIds,
				skipped: [...manifest.skipped, ...failed],
				recorded_at: nowIso(),
			});
			pi.events.emit("harness-runs-cleared", {
				deleted,
				projectRoot,
			});
		},
	});
}

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
			if (hasConfirmedClearAfterLatestRunContext(entries)) active.set(null);

			let ctxState =
				getLatestRunContext(entries) ??
				(hasConfirmedClearAfterLatestRunContext(entries) ? null : active.get());
			if (!ctxState)
				ctxState = await hydrateFromDisk(sessionId, projectRoot, entries);
			if (!ctxState) {
				const msg = 'No active harness run. Start with /harness-plan "<task>".';
				if (ctx.hasUI) ctx.ui.notify(msg, "warning");
				return;
			}
			ctxState = await refreshRunContextProgress(
				projectRoot,
				ctxState,
				entries,
			);
			active.set(ctxState);
			persistContext(pi, ctxState);
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
	input.activeCtx.plan_ready = false;
	const synced = await syncPlanLastOutcomeFromTaskClarification(
		input.projectRoot,
		input.activeCtx,
	);
	Object.assign(input.activeCtx, synced);
	persistContext(input.pi, input.activeCtx);
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
	notifyHarnessHandoff(input.ctx, msg, "warning");
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
	const beforeReady = input.activeCtx.plan_ready;
	const synced = await syncPlanReadyFromDisk(
		process.cwd(),
		input.activeCtx,
		input.entries,
	);
	Object.assign(input.activeCtx, synced);
	if (!beforeReady && synced.plan_ready && synced.plan_packet_path) {
		const packet = await readPlanPacketFromPath(synced.plan_packet_path);
		if (packet?.plan_id) {
			syncPolicyFromPlan(input.pi, input.entries, packet.plan_id, "plan", true);
			const summary = planPacketSummary(packet, synced.plan_packet_path);
			input.pi.appendEntry("harness-plan-packet", summary);
		}
	} else if (
		synced.plan_packet_path &&
		!synced.plan_ready &&
		synced.last_outcome === "pending_approval"
	) {
		const msg =
			"A draft plan-packet.yaml is on disk, but user approval was not recorded. Complete Review Gate (debate rounds + harness_debate_consensus), then call approve_plan; use create_plan only after Approve.";
		notifyHarnessHandoff(input.ctx, msg, "warning");
	}
	persistContext(input.pi, input.activeCtx);
}

function registerPlanApprovalCapture(
	pi: ExtensionAPI,
	active: ActiveContextAccess,
): void {
	pi.on("tool_result", async (event, ctx) => {
		if (event.isError) return;
		if (event.toolName !== "ask_user" && event.toolName !== "approve_plan")
			return;
		const entries = getEntries(ctx);
		const runCtx = getLatestRunContext(entries) ?? active.get();
		if (!runCtx) return;
		if (event.toolName === "ask_user") {
			const details = event.details as { cancelled?: boolean; input?: unknown };
			if (details?.cancelled) {
				// Ignore cancels from later planning forks (e.g. debate profile choice):
				// only treat cancel as Phase-0 clarification failure when clarification
				// is not already locked ready.
				const runRoot = join(
					process.cwd(),
					".pi",
					"harness",
					"runs",
					runCtx.run_id ?? "",
				);
				const clarDoc = runCtx.run_id
					? await readTaskClarificationDoc(runRoot)
					: null;
				const clarReady =
					String(clarDoc?.status ?? "").toLowerCase() === "ready";
				if (!clarReady) {
					const synced = await syncPlanLastOutcomeFromTaskClarification(
						process.cwd(),
						runCtx,
					);
					Object.assign(runCtx, synced);
					persistContext(pi, runCtx);
				}
			} else if (
				!isPlanApprovalAskUser(
					(details?.input ?? {}) as {
						question?: string;
						options?: unknown[];
						questions?: unknown[];
					},
				)
			) {
				pi.appendEntry("harness-task-clarification-engagement", {
					run_id: runCtx.run_id,
					recorded_at: nowIso(),
					source: "ask_user",
				});
				const synced = await syncPlanLastOutcomeFromTaskClarification(
					process.cwd(),
					runCtx,
				);
				Object.assign(runCtx, synced);
				persistContext(pi, runCtx);
			}
		}
		const approval = parsePlanApprovalFromMessage({
			toolName: event.toolName,
			details: event.details,
			content: event.content,
		});
		if (!approval) return;
		pi.appendEntry("harness-plan-approval", {
			plan_id: approval.plan_id ?? runCtx.plan_id,
			approved_at: approval.approved_at,
			source: approval.source,
		});
	});
}

function registerHeadlessPlanProgressWatcher(
	pi: ExtensionAPI,
	active: ActiveContextAccess,
): void {
	pi.on("tool_result", async (event, ctx) => {
		if (event.isError) return;
		await handlePlanToolResultForHeadlessProgress({ pi, ctx, active });
	});
}

const EXECUTOR_AGENT_ID = "harness/running/executor";

function subagentResultsFromDetails(
	details: unknown,
): Array<{ agent?: string }> {
	const d = details as { results?: Array<{ agent?: string }> };
	return d?.results ?? [];
}

async function reconcileExecutorHandoffFromParent(input: {
	pi: ExtensionAPI;
	ctx: {
		hasUI: boolean;
		ui: { notify(message: string, type?: "info" | "warning" | "error"): void };
		sessionManager: { getEntries(): unknown[] };
		abort?: () => void;
	};
	active: ActiveContextAccess;
	runPostWork?: boolean;
}): Promise<void> {
	const entries = getEntries(input.ctx);
	const runCtx = getLatestRunContext(entries) ?? input.active.get();
	if (!runCtx?.run_id) return;
	const projectRoot = process.cwd();
	if (input.runPostWork && executePostWorkEnabled()) {
		const post = await runExecutePostWork({
			projectRoot,
			runId: runCtx.run_id,
			moduleUrl: MODULE_URL,
		});
		if (post.notes.length > 0) {
			input.pi.appendEntry("harness-execute-postwork", {
				run_id: runCtx.run_id,
				...post,
				recorded_at: nowIso(),
			});
		}
	}
	const refreshed = await refreshRunContextProgress(
		projectRoot,
		runCtx,
		entries,
	);
	Object.assign(runCtx, refreshed);
	input.active.set(runCtx);
	persistContext(input.pi, runCtx);
	if (refreshed.last_completed_step !== "execute") return;

	const handoff = await readExecutorHandoffFromRun(runCtx.run_id, projectRoot);
	const notify = `Execute finished (${refreshed.last_outcome ?? "done"}). Next: ${refreshed.next_recommended_command ?? "/harness-review"}`;
	input.pi.appendEntry("harness-step-handoff", {
		next_command: refreshed.next_recommended_command,
		execution_status: refreshed.last_outcome,
		phase: refreshed.phase,
		source: "executor_reconcile",
	});
	if (!isHarnessNonInteractive()) {
		input.pi.appendEntry("harness-executor-handoff-brief", {
			run_id: runCtx.run_id,
			brief: formatExecutorHandoffBrief(handoff),
			recorded_at: nowIso(),
		});
	}
	if (input.ctx.hasUI) input.ctx.ui.notify(notify, "info");

	const parsed = latestParsedHarnessCommand(entries);
	if (
		isHarnessNonInteractive() &&
		parsed?.command === "harness-run" &&
		(await shouldEndHeadlessHarnessPrintSession({
			command: parsed.command,
			runCtx,
			projectRoot,
		}))
	) {
		endHeadlessHarnessPrintSession(input.ctx);
	}
}

function registerExecutorHandoffReconcile(
	pi: ExtensionAPI,
	active: ActiveContextAccess,
): void {
	pi.on("tool_result", async (event, ctx) => {
		if (event.isError) return;
		if (event.toolName === "submit_executor_handoff") {
			await reconcileExecutorHandoffFromParent({
				pi,
				ctx,
				active,
				runPostWork: false,
			});
			return;
		}
		if (event.toolName !== "subagent") return;
		const hasExecutor = subagentResultsFromDetails(event.details).some(
			(r) => r.agent === EXECUTOR_AGENT_ID,
		);
		if (!hasExecutor) return;
		await reconcileExecutorHandoffFromParent({
			pi,
			ctx,
			active,
			runPostWork: true,
		});
	});
}

async function guardToolCall(input: {
	event: { toolName: string; input: unknown };
	ctx: { sessionManager: { getEntries(): unknown[] } };
	activeCtx: HarnessRunContext | null;
}) {
	const { isHarnessAgtPolicyEnabled } = await import("../lib/agt/config.js");
	if (!isHarnessAgtPolicyEnabled()) {
		if (isSubmitToolName(input.event.toolName)) {
			const packageRoot = getHarnessPackageRoot(MODULE_URL);
			const allowed = allowsAgentTool({
				packageRoot,
				projectRoot: process.cwd(),
				agentId: "parent-orchestrator",
				toolName: input.event.toolName,
				toolInput: input.event.input as Record<string, unknown>,
				isSubprocess: false,
				isParentOrchestrator: true,
			});
			if (!allowed) {
				return {
					block: true,
					reason: `agents-policy: ${input.event.toolName} blocked for parent-orchestrator`,
				};
			}
		}
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
	if (!isHarnessAgtPolicyEnabled()) {
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
		const task = extractTaskSummary(input.args, input.userPrompt);
		if (
			input.command === "harness-auto" &&
			activeCtx &&
			task &&
			harnessAutoTasksDiffer(activeCtx, task)
		) {
			activeCtx.status = "aborted";
			activeCtx.plan_ready = false;
			activeCtx.last_outcome = "abandoned";
			activeCtx.last_completed_step = "abort";
			persistContext(input.pi, activeCtx);
			activeCtx = null;
		}
		if (
			activeCtx &&
			(input.command === "harness-plan" || input.command === "harness-auto") &&
			activeCtx.owner_pi_session_id !== input.sessionId
		) {
			const foreignRunConflict = await findActiveRunOwnershipConflict(
				input.projectRoot,
				input.sessionId,
			);
			if (foreignRunConflict) {
				return {
					activeCtx,
					resolved,
					response: blockRunContextMessage(
						`Another Pi session (${foreignRunConflict.ownerPiSessionId}) owns active run ${foreignRunConflict.runId}. Finish or abort that run before starting a new plan.`,
					),
				};
			}
			activeCtx = null;
		}
		const reuseRun =
			activeCtx &&
			shouldReuseHarnessRunId(input.userPrompt, activeCtx, input.command);
		if (!activeCtx || !reuseRun) {
			if (process.env.HARNESS_QA_SMOKE === "1") {
				await releaseForeignQaRunOwnership(input.projectRoot, input.sessionId);
			}
			const ownershipConflict = await findActiveRunOwnershipConflict(
				input.projectRoot,
				input.sessionId,
			);
			if (ownershipConflict) {
				return {
					activeCtx,
					resolved,
					response: blockRunContextMessage(
						`Another Pi session (${ownershipConflict.ownerPiSessionId}) owns active run ${ownershipConflict.runId}. Finish or abort that run before starting a new plan.`,
					),
				};
			}
			if (activeCtx?.status === "active") {
				activeCtx.status = "aborted";
				activeCtx.plan_ready = false;
				activeCtx.last_outcome = "abandoned";
				activeCtx.last_completed_step = "abort";
				persistContext(input.pi, activeCtx);
			}
			activeCtx = createFreshRunContext(
				input.sessionId,
				input.projectRoot,
				task,
			);
		} else if (input.command === "harness-auto") {
			activeCtx = resetRunContextForHarnessAuto(activeCtx);
			if (task) activeCtx.task_summary = task;
		} else if (
			input.command === "harness-plan" &&
			activeCtx.status === "aborted"
		) {
			activeCtx = resetRunContextForHarnessAuto(activeCtx);
		}
		if (input.command === "harness-plan") {
			if (task) activeCtx.task_summary = task;
		}
		startFreshPlanAttempt({
			pi: input.pi,
			activeCtx,
			command: input.command,
			turn: input.turn,
			sessionId: input.sessionId,
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

async function handlePreResolvedHarnessCommand(args: {
	pi: ExtensionAPI;
	activeCtx: HarnessRunContext | null;
	command: string;
	parsedArgs: string;
	userPrompt: string;
	systemPrompt: string;
	sessionId: string;
	projectRoot: string;
	entries: unknown[];
	driftActive: boolean;
}): Promise<{
	activeCtx: HarnessRunContext | null;
	response: any;
	handled: boolean;
}> {
	const {
		pi,
		activeCtx,
		command,
		parsedArgs,
		userPrompt,
		systemPrompt,
		sessionId,
		projectRoot,
		entries,
		driftActive,
	} = args;
	if (
		!isHarnessBootstrapPrompt(userPrompt) &&
		!hasHarnessAbortSignal(userPrompt)
	) {
		const policyBlock = getPolicyTransitionBlock(
			userPrompt,
			entries,
			activeCtx,
		);
		if (policyBlock.blocked) {
			return {
				activeCtx,
				response: blockRunContextMessage(
					policyBlock.message ?? "Harness command blocked by policy phase.",
				),
				handled: true,
			};
		}
	}
	if (command === "harness-abort") {
		if (!activeCtx) {
			if (process.env.HARNESS_QA_SMOKE === "1") {
				const released = await releaseForeignQaRunOwnership(
					projectRoot,
					sessionId,
				);
				if (released) {
					return {
						activeCtx: null,
						response: blockRunContextMessage(
							'Stale QA harness run released from disk. Next: /harness-plan "<task>"',
						),
						handled: true,
					};
				}
			}
			return {
				activeCtx,
				response: blockRunContextMessage(
					'No active harness run to abort. Next: /harness-plan "<task>"',
				),
				handled: true,
			};
		}
		const reason = parsedArgs.trim() || "manual abort";
		const aborted = abortActiveRunContext({ pi, activeCtx, reason });
		return {
			activeCtx: aborted,
			response: blockRunContextMessage(
				`Harness aborted. Mutating tools are blocked until a new approved plan is attached. Next: ${aborted.next_recommended_command}`,
			),
			handled: true,
		};
	}

	if (command === "harness-new-run") {
		const next = await createNewRunContextForCommand({
			pi,
			activeCtx,
			sessionId,
			projectRoot,
			args: parsedArgs,
			userPrompt,
			systemPrompt,
		});
		return {
			activeCtx: next.activeCtx,
			response: next.response,
			handled: true,
		};
	}
	if (command === "harness-use-run") {
		const next = await bindExistingRunForCommand({
			pi,
			sessionId,
			projectRoot,
			entries,
			args: parsedArgs,
			systemPrompt,
		});
		return {
			activeCtx: next.activeCtx ?? activeCtx,
			response: next.response,
			handled: true,
		};
	}
	if (command === "harness-run-status" || command === "harness-clear") {
		return { activeCtx, response: undefined, handled: true };
	}
	if (
		command === "harness-plan" &&
		activeCtx &&
		isNewTaskPlanBlocked(activeCtx, userPrompt) &&
		!isAmendPlanAllowed(activeCtx, userPrompt, driftActive)
	) {
		return {
			activeCtx,
			response: blockRunContextMessage(
				"Active harness run in progress. Use /harness-abort or /harness-new-run before starting a new task plan.",
			),
			handled: true,
		};
	}
	return { activeCtx, response: null, handled: false };
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
	if (hasConfirmedClearAfterLatestRunContext(entries)) input.active.set(null);

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
		const synced = await syncPlanLastOutcomeFromTaskClarification(
			projectRoot,
			activeCtx,
		);
		if (synced.last_outcome !== "needs_clarification") {
			input.active.set(synced);
			persistContext(input.pi, synced);
		} else {
			return maybeHandleClarificationFollowUp({
				pi: input.pi,
				activeCtx,
				entries,
				systemPrompt: input.event.systemPrompt,
			});
		}
	}
	if (!parsed) return undefined;
	const { command, args } = parsed;
	const planQuick = parseArgFlag(args, "--quick") != null;
	const planRisk = parseArgFlag(args, "--risk") ?? "med";
	const preResolved = await handlePreResolvedHarnessCommand({
		pi: input.pi,
		activeCtx,
		command,
		parsedArgs: args,
		userPrompt,
		systemPrompt: input.event.systemPrompt,
		sessionId,
		projectRoot,
		entries,
		driftActive,
	});
	activeCtx = preResolved.activeCtx;
	if (preResolved.handled) {
		input.active.set(activeCtx);
		return preResolved.response;
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
	if (
		isHarnessNonInteractive() &&
		(await shouldEndHeadlessHarnessPrintSession({
			command,
			runCtx: activeCtx,
			projectRoot,
		}))
	) {
		endHeadlessHarnessPrintSession(input.ctx);
		return {
			systemPrompt: `${input.event.systemPrompt}\n\n[Harness] Headless session complete; ending.`,
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
		if (!check.ok)
			return blockRunContextMessage(check.reason ?? "Invalid --plan override");
		activeCtx.plan_packet_path = resolved.planPath;
	}
	let planSynced = await reconcileStaleExecuteCompletion(
		projectRoot,
		activeCtx,
		entries,
	);
	planSynced = await reconcileReviewRouting(projectRoot, planSynced);
	Object.assign(activeCtx, planSynced);
	persistContext(input.pi, activeCtx);
	const autoBlockReason = await blockingHarnessAutoCommandReason(
		command,
		activeCtx,
		args,
		userPrompt,
	);
	if (autoBlockReason) return blockRunContextMessage(autoBlockReason);
	const runBlockReason = await blockingRunCommandReason(
		command,
		activeCtx,
		projectRoot,
		entries,
	);
	if (runBlockReason) return blockRunContextMessage(runBlockReason);
	if (
		(command === "harness-run" || command === "harness-auto") &&
		activeCtx.plan_ready
	) {
		const runDir = join(
			projectRoot,
			".pi",
			"harness",
			"runs",
			activeCtx.run_id,
		);
		try {
			const branchResult = await ensureHarnessGitBranch({
				projectRoot,
				runId: activeCtx.run_id,
				upPkg: getHarnessPackageRoot(MODULE_URL),
			});
			await writeGitWorkflowArtifact({ runDir, result: branchResult });
		} catch (err) {
			console.warn(
				`[harness-run-context] git branch ensure failed: ${err instanceof Error ? err.message : err}`,
			);
		}
	}
	const reviewBlockReason = await blockingReviewCommandReason(
		command,
		activeCtx,
		projectRoot,
	);
	if (reviewBlockReason) return blockRunContextMessage(reviewBlockReason);
	const steerBlockReason = await blockingSteerCommandReason(
		command,
		activeCtx,
		projectRoot,
	);
	if (steerBlockReason) return blockRunContextMessage(steerBlockReason);
	if (command === "harness-steer") {
		const steerEffects = await resolveSteerEntryEffects(
			activeCtx.run_id,
			projectRoot,
			args,
		);
		activeCtx.steer_max_attempts =
			activeCtx.steer_max_attempts ?? steerMaxAttemptsFromEnv();
		activeCtx = await updateSteerStateOnEntry(
			activeCtx.run_id,
			projectRoot,
			steerEffects,
			activeCtx,
		);
		activeCtx.phase = "execute";
		if (steerEffects.markBurstUsed) {
			activeCtx.inline_repair_attempted = true;
		}
		input.active.set(activeCtx);
		persistContext(input.pi, activeCtx);
		syncPolicyFromRunContext(input.pi, entries, activeCtx);
		if (process.env.HARNESS_QA_SMOKE === "1" && steerEffects.skipExecutor) {
			const runDir = join(
				projectRoot,
				".pi",
				"harness",
				"runs",
				activeCtx.run_id,
			);
			try {
				const { runHarnessSteerHygiene } = await import(
					"../scripts/harness-steer-hygiene.mjs"
				);
				await runHarnessSteerHygiene({ runDir, projectRoot });
				activeCtx.last_completed_step = "steer";
				activeCtx.last_outcome = "completed";
				activeCtx.next_recommended_command = "/harness-review";
				activeCtx.phase = "evaluate";
				input.active.set(activeCtx);
				persistContext(input.pi, activeCtx);
				syncPolicyFromRunContext(input.pi, entries, activeCtx);
			} catch (err) {
				console.warn(
					`[harness-run-context] QA steer hygiene failed: ${err instanceof Error ? err.message : err}`,
				);
			}
		}
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
	const syncedCtx = await syncPlanLastOutcomeFromTaskClarification(
		projectRoot,
		activeCtx,
	);
	Object.assign(activeCtx, syncedCtx);
	if (command === "harness-plan" || command === "harness-auto") {
		const runDir = join(
			projectRoot,
			".pi",
			"harness",
			"runs",
			activeCtx.run_id,
		);
		await seedHeadlessTaskClarificationIfNeeded({
			runDir,
			taskSummary: activeCtx.task_summary ?? "",
			riskLevel: planRisk,
			quick: planQuick,
		});
		const resynced = await syncPlanLastOutcomeFromTaskClarification(
			projectRoot,
			activeCtx,
		);
		Object.assign(activeCtx, resynced);
	}
	input.active.set(activeCtx);
	persistContext(input.pi, activeCtx);
	if (command === "harness-plan" || command === "harness-auto") {
		syncPolicyFromRunContext(input.pi, entries, activeCtx);
	}
	let gateBlock = "";
	if (command === "harness-plan" || command === "harness-auto") {
		const gateStatus = await resolvePlanHumanGateStatus(
			projectRoot,
			activeCtx.run_id,
			entries,
			{
				quick: planQuick,
				taskSummary: activeCtx.task_summary ?? undefined,
				lastOutcome: activeCtx.last_outcome ?? undefined,
			},
		);
		gateBlock = formatPlanHumanGateBlock(gateStatus);
	}
	const gateSuffix = gateBlock ? `\n\n${gateBlock}` : "";
	let commandBlock = "";
	if (command === "harness-review") {
		const runDir = join(
			projectRoot,
			".pi",
			"harness",
			"runs",
			activeCtx.run_id,
		);
		commandBlock = `\n\n## Review Phase 1 preflight (required before evaluators)\nRun deterministic shell in this session, then hard-gate:\n\`\`\`bash\nnode "$UP_PKG/.pi/scripts/harness-verify.mjs"\nnode "$UP_PKG/.pi/scripts/harness-review-preflight.mjs" --run-dir "${runDir}" --steer-attempt ${activeCtx.steer_attempt ?? 0}\n\`\`\`\nInclude \`steer_attempt\` on \`artifacts/benchmark-log.yaml\`. After steer repair, run \`harness-adversary-repro-pack.mjs\` before lite-review adversary skip.\nDo **not** embed executor repair in this session — use \`/harness-steer\` or \`/harness-steer --burst\`.`;
	}
	if (command === "harness-steer") {
		const brief = await readRepairBriefFromRun(activeCtx.run_id, projectRoot);
		const runDir = join(
			projectRoot,
			".pi",
			"harness",
			"runs",
			activeCtx.run_id,
		);
		if (brief?.gap_kind === "hygiene") {
			commandBlock = `\n\n## Hygiene steer\n\`gap_kind: hygiene\` — run hygiene script **before** spawning executor:\n\`\`\`bash\nnode "$UP_PKG/.pi/scripts/harness-steer-hygiene.mjs" --run-dir "${runDir}" --project-root "${projectRoot}"\n\`\`\`\nDo **not** spawn \`harness/running/executor\` for hygiene-only gaps. Then \`/harness-review\`.`;
		}
		if (isSteerBurstArgs(args)) {
			commandBlock += `\n\n## Burst steer\nPreflight:\n\`\`\`bash\nnode "$UP_PKG/.pi/scripts/harness-inline-repair.mjs" --run-dir "${runDir}"\n\`\`\`\nRequires eval pass + adversary \`block_merge\` on disk and \`HARNESS_STEER_BURST=1\`.`;
		}
	}
	return {
		systemPrompt: `${input.event.systemPrompt}\n\n${formatPlanContextBlock(activeCtx, contextSpawnOpts)}${activePlanBlock ? `\n\n${activePlanBlock}` : ""}${gateSuffix}${commandBlock}`,
	};
}

async function applyHeadlessPlanFinalizeAndQaSmoke(input: {
	pi: ExtensionAPI;
	ctx: any;
	active: ActiveContextAccess;
	command: string;
	args: string;
	activeCtx: HarnessRunContext;
	entries: unknown[];
}): Promise<void> {
	const projectRoot = process.cwd();
	const planQuick = parseArgFlag(input.args, "--quick") != null;
	const planRisk = parseArgFlag(input.args, "--risk") ?? "med";
	const outcome = await tryHeadlessAutoPlanFinalize({
		projectRoot,
		runCtx: input.activeCtx,
		taskSummary: input.activeCtx.task_summary ?? "",
		entries: input.entries,
		riskLevel: planRisk,
		quick: planQuick,
		deps: {
			appendEntry: (type, data) => input.pi.appendEntry(type, data),
			getEntries: () => getEntries(input.ctx),
			getSubagentEntries: () => getEntries(input.ctx),
			onPlanCommitted: (updated, packet, planPath) => {
				input.pi.appendEntry("harness-run-context", updated);
				input.pi.appendEntry(
					"harness-plan-packet",
					planPacketSummary(packet, planPath, "ready"),
				);
			},
		},
	});
	if (
		outcome.progress.seeded_clarification ||
		outcome.progress.seeded_planning_context ||
		outcome.progress.patched_review_gate ||
		outcome.progress.wrote_consensus_bypass
	) {
		input.pi.appendEntry("harness-headless-plan-progress", {
			run_id: input.activeCtx.run_id,
			...outcome.progress,
			recorded_at: nowIso(),
		});
	}
	if (outcome.finalized) {
		const synced = await syncPlanReadyFromDisk(
			projectRoot,
			input.activeCtx,
			input.entries,
		);
		Object.assign(input.activeCtx, synced);
		persistContext(input.pi, input.activeCtx);
		input.active.set(input.activeCtx);
		input.pi.appendEntry("harness-headless-plan-finalized", {
			run_id: input.activeCtx.run_id,
			source: "headless_auto",
			recorded_at: nowIso(),
		});
		input.activeCtx.next_recommended_command = "/harness-run";
		persistContext(input.pi, input.activeCtx);
		if (input.command === "harness-auto") {
			await maybeHeadlessQaAutoExecuteSmoke({
				projectRoot,
				runCtx: input.activeCtx,
				command: input.command,
			});
			persistContext(input.pi, input.activeCtx);
		}
		if (
			await shouldEndHeadlessHarnessPrintSession({
				command: input.command,
				runCtx: input.activeCtx,
				projectRoot,
			})
		) {
			endHeadlessHarnessPrintSession(input.ctx);
		}
	} else if (outcome.reason && outcome.progress.force_reason) {
		input.pi.appendEntry("harness-headless-plan-progress", {
			run_id: input.activeCtx.run_id,
			finalize_blocked: outcome.reason,
			recorded_at: nowIso(),
		});
	}
}

async function handleHeadlessPlanProgressCheck(input: {
	pi: ExtensionAPI;
	ctx: any;
	active: ActiveContextAccess;
}): Promise<void> {
	const entries = getEntries(input.ctx);
	const turn = getLatestHarnessTurn(entries);
	if (
		!turn ||
		(turn.command !== "harness-plan" && turn.command !== "harness-auto")
	) {
		return;
	}
	const activeCtx = input.active.get() ?? getLatestRunContext(entries);
	if (!activeCtx?.run_id || activeCtx.plan_ready) return;
	await applyHeadlessPlanFinalizeAndQaSmoke({
		pi: input.pi,
		ctx: input.ctx,
		active: input.active,
		command: turn.command,
		args: turn.args,
		activeCtx,
		entries,
	});
}

async function handleTurnStart(input: {
	pi: ExtensionAPI;
	ctx: any;
	active: ActiveContextAccess;
}): Promise<void> {
	await handleHeadlessPlanProgressCheck(input);
}

async function handlePlanToolResultForHeadlessProgress(input: {
	pi: ExtensionAPI;
	ctx: any;
	active: ActiveContextAccess;
}): Promise<void> {
	const entries = getEntries(input.ctx);
	const since = Math.max(0, indexOfLastPlanCommand(entries));
	const sinceEntries = entries.length - since;
	if (sinceEntries > 0 && sinceEntries % 12 !== 0) return;
	await handleHeadlessPlanProgressCheck(input);
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
	let reconciledOnEnd = await reconcileStaleExecuteCompletion(
		projectRoot,
		activeCtx,
		entries,
	);
	reconciledOnEnd = await reconcileReviewRouting(projectRoot, reconciledOnEnd);
	Object.assign(activeCtx, reconciledOnEnd);
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
	if (
		parsed?.command === "harness-plan" ||
		parsed?.command === "harness-auto"
	) {
		const planArgs = parsed.args ?? "";
		const quick = parseArgFlag(planArgs, "--quick") != null;
		const risk = parseArgFlag(planArgs, "--risk") ?? "med";
		const forced = await maybeForceHeadlessPlanProgress({
			projectRoot,
			runId: activeCtx.run_id,
			taskSummary: activeCtx.task_summary ?? "",
			entries,
			riskLevel: risk,
			quick,
		});
		if (
			forced.seeded_clarification ||
			forced.seeded_planning_context ||
			forced.patched_review_gate ||
			forced.wrote_consensus_bypass
		) {
			input.pi.appendEntry("harness-headless-plan-progress", {
				run_id: activeCtx.run_id,
				...forced,
				recorded_at: nowIso(),
			});
		}
		const synced = await syncPlanLastOutcomeFromTaskClarification(
			projectRoot,
			activeCtx,
		);
		Object.assign(activeCtx, synced);
		persistContext(input.pi, activeCtx);
	}
	if (
		parsed?.command === "harness-plan" ||
		parsed?.command === "harness-auto"
	) {
		if (!activeCtx.plan_ready) {
			await applyHeadlessPlanFinalizeAndQaSmoke({
				pi: input.pi,
				ctx: input.ctx,
				active: input.active,
				command: parsed.command,
				args: parsed.args ?? "",
				activeCtx,
				entries,
			});
		} else if (
			parsed.command === "harness-auto" &&
			process.env.HARNESS_QA_SMOKE === "1"
		) {
			await maybeHeadlessQaAutoExecuteSmoke({
				projectRoot,
				runCtx: activeCtx,
				command: parsed.command,
			});
			await maybeHeadlessGitQaFinalizeOnRun({
				projectRoot,
				runCtx: activeCtx,
				command: parsed.command,
				upPkg: getHarnessPackageRoot(MODULE_URL),
			});
			persistContext(input.pi, activeCtx);
			if (
				await shouldEndHeadlessHarnessPrintSession({
					command: parsed.command,
					runCtx: activeCtx,
					projectRoot,
				})
			) {
				endHeadlessHarnessPrintSession(input.ctx);
			}
		}
	}
	const statuses = await resolveCompletionStatuses(
		entries,
		activeCtx.run_id,
		projectRoot,
	);
	if (parsed?.command === "harness-run" || parsed?.command === "harness-auto") {
		let execStatus = statuses.executionStatus;
		if (!execStatus) {
			const handoff = await readExecutorHandoffFromRun(
				activeCtx.run_id,
				projectRoot,
			);
			execStatus = handoff?.execution_status ?? null;
		}
		const runPost = resolveHarnessRunPostAgentState(
			execStatus,
			activeCtx.plan_ready,
		);
		Object.assign(activeCtx, runPost);
		if (
			parsed?.command === "harness-run" ||
			parsed?.command === "harness-auto"
		) {
			await maybeHeadlessGitQaFinalizeOnRun({
				projectRoot,
				runCtx: activeCtx,
				command: parsed.command,
				upPkg: getHarnessPackageRoot(MODULE_URL),
			});
		}
	}
	if (parsed?.command === "harness-steer") {
		activeCtx.last_completed_step = "steer";
		activeCtx.steer_max_attempts =
			activeCtx.steer_max_attempts ?? steerMaxAttemptsFromEnv();
		activeCtx.phase = "execute";
		await invalidateEvalVerdictAfterRepair(activeCtx.run_id, projectRoot);
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
	if (
		["harness-eval", "harness-review", "harness-critic"].includes(
			parsed?.command ?? "",
		)
	) {
		await ensureReviewOutcomeFromEval(activeCtx.run_id, projectRoot);
	}
	const remediationClass = await resolveRemediationClassForRun(
		activeCtx.run_id,
		projectRoot,
	);
	const adversaryReport = await readAdversaryReportFromRun(
		activeCtx.run_id,
		projectRoot,
	);
	const evalVerdict = await readEvalVerdictFromRun(
		activeCtx.run_id,
		projectRoot,
	);
	const burstAllowed = steerBurstAllowed(
		evalVerdict,
		adversaryReport,
		activeCtx.inline_repair_attempted,
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
		remediationClass,
		steerAttempt: activeCtx.steer_attempt ?? 0,
		steerMaxAttempts: activeCtx.steer_max_attempts ?? steerMaxAttemptsFromEnv(),
		reviewComplete,
		burstAllowed,
	});
	activeCtx.next_recommended_command = next;
	activeCtx.updated_at = new Date().toISOString();
	if (
		(parsed?.command === "harness-run" || parsed?.command === "harness-auto") &&
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
		notifyHarnessHandoff(input.ctx, `Next: ${next}`);
	}
	if (
		parsed &&
		(await shouldEndHeadlessHarnessPrintSession({
			command: parsed.command,
			runCtx: activeCtx,
			projectRoot,
		}))
	) {
		endHeadlessHarnessPrintSession(input.ctx);
	}
}

function registerHarnessRunContextTool1(
	pi: ExtensionAPI,
	active: ActiveContextAccess,
) {
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
					"Run-relative path (preferred): artifacts/decomposition.yaml, research-brief.yaml, plan-packet.yaml. The active run id is applied automatically — do not prefix with .pi/harness/runs/.",
			}),
			content: Type.String({
				description:
					"YAML or JSON document (fenced or raw) matching the artifact schema",
			}),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const entries = getEntries(ctx);
			const runCtx = getLatestRunContext(entries) ?? active.get();
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
			const resolved = resolveHarnessRunWriteTarget(
				pathArg,
				runCtx,
				projectRoot,
			);
			const absPath =
				resolved?.absPath ?? normalizeHarnessPath(pathArg, projectRoot);
			const scoped =
				resolved != null ||
				(await isPlanPhaseScopedWrite(absPath, runCtx, projectRoot));
			if (!scoped) {
				return {
					content: [
						{
							type: "text",
							text: `Path not allowed: ${pathArg}. Use a run-relative path like artifacts/decomposition.yaml or research-brief.yaml (active run ${runCtx.run_id} is applied automatically). Full paths under .pi/harness/runs/${runCtx.run_id}/ are also accepted.`,
						},
					],
					details: { path: pathArg, run_id: runCtx.run_id },
					isError: true,
				};
			}
			const relForGate =
				resolved?.relUnderRun ??
				(await relPathUnderActiveRun(absPath, runCtx, projectRoot)) ??
				pathArg.replace(/\\/g, "/");
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
			const runRootWrite = join(
				projectRoot,
				".pi",
				"harness",
				"runs",
				runCtx.run_id,
			);
			const clarWrite = await assertTaskClarificationReadyForPlanWrite(
				runRootWrite,
				relForGate,
			);
			if (!clarWrite.ok) {
				return {
					content: [{ type: "text", text: clarWrite.message ?? "Blocked." }],
					details: { path: pathArg },
					isError: true,
				};
			}
			let doc: unknown;
			try {
				doc = parseStructuredDocument(content, pathArg);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				const hint =
					msg.includes("not valid YAML") || msg.includes("JSON parse")
						? " Pass a fenced ```yaml block, raw YAML object, or JSON object — not prose or a partial fragment."
						: "";
				return {
					content: [
						{
							type: "text",
							text: `${relForGate}: ${msg}${hint}`,
						},
					],
					details: { path: relForGate, run_id: runCtx.run_id },
					isError: true,
				};
			}
			const docRecord = doc as Record<string, unknown>;
			if (relForGate === TASK_CLARIFICATION_ARTIFACT) {
				const humanGate = validateTaskClarificationHumanGate(
					entries,
					docRecord,
					{
						quick:
							parseArgFlag(
								getLatestHarnessTurn(entries)?.args ?? "",
								"--quick",
							) != null,
						taskSummary: runCtx.task_summary ?? undefined,
						allowFollowUpMessage: runCtx.last_outcome === "needs_clarification",
					},
				);
				if (!humanGate.ok) {
					return {
						content: [
							{
								type: "text",
								text: humanGate.errors.join("\n"),
							},
						],
						details: { path: pathArg },
						isError: true,
					};
				}
			}
			if (relForGate === "artifacts/plan-phase-status.yaml") {
				const planStatus = String(docRecord.plan_status ?? "").toLowerCase();
				if (
					planStatus === "ready" &&
					!hasPlanUserApproval(entries, { sincePlanCommand: true })
				) {
					return {
						content: [
							{
								type: "text",
								text: "Blocked: plan_status ready requires approve_plan (then create_plan) before marking the plan phase complete.",
							},
						],
						details: { path: pathArg },
						isError: true,
					};
				}
			}
			await mkdir(dirname(absPath), { recursive: true });
			await writeYamlFile(absPath, doc);
			if (relForGate === TASK_CLARIFICATION_ARTIFACT) {
				const clarDoc = doc as Record<string, unknown>;
				if (String(clarDoc.status ?? "").toLowerCase() === "ready") {
					const clarified = String(clarDoc.clarified_task ?? "").trim();
					if (clarified) {
						runCtx.task_summary = clarified;
						persistContext(pi, runCtx);
					}
				}
			}
			return {
				content: [
					{
						type: "text",
						text: `Wrote ${relForGate} as canonical YAML.`,
					},
				],
				details: { path: absPath, rel: relForGate, run_id: runCtx.run_id },
			};
		},
	});
}

function registerHarnessRunContextTool2(
	pi: ExtensionAPI,
	active: ActiveContextAccess,
) {
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
			const runCtx = getLatestRunContext(entries) ?? active.get();
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
			const resolved = resolveHarnessRunWriteTarget(
				pathArg,
				runCtx,
				projectRoot,
			);
			const absPath =
				resolved?.absPath ?? normalizeHarnessPath(pathArg, projectRoot);
			const scoped =
				resolved != null ||
				(await isPlanPhaseScopedWrite(absPath, runCtx, projectRoot));
			if (!scoped) {
				return {
					content: [
						{
							type: "text",
							text: `Path not allowed: ${pathArg}. Use run-relative paths like artifacts/decomposition.yaml (active run ${runCtx.run_id}).`,
						},
					],
					details: { path: pathArg, run_id: runCtx.run_id },
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
			const relMerge =
				resolved?.relUnderRun ??
				(await relPathUnderActiveRun(absPath, runCtx, projectRoot)) ??
				pathArg.replace(/\\/g, "/");
			const clarMerge = await assertTaskClarificationReadyForPlanWrite(
				runRoot,
				relMerge,
			);
			if (!clarMerge.ok) {
				return {
					content: [{ type: "text", text: clarMerge.message ?? "Blocked." }],
					details: { path: pathArg },
					isError: true,
				};
			}
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
}

function registerHarnessRunContextTool3(
	pi: ExtensionAPI,
	active: ActiveContextAccess,
) {
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
			const runCtx = getLatestRunContext(entries) ?? active.get();
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
}

function registerHarnessRunContextTool4(
	pi: ExtensionAPI,
	active: ActiveContextAccess,
) {
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
			const runCtx = getLatestRunContext(entries) ?? active.get();
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
				"../lib/harness-artifact-gate.js"
			);
			const turn = getLatestHarnessTurn(entries);
			const gate = await validateHarnessArtifactPaths(
				runRoot,
				paths,
				specsDir,
				{
					entries,
					quick: turn ? parseArgFlag(turn.args, "--quick") != null : false,
					taskSummary: runCtx.task_summary ?? undefined,
					lastOutcome: runCtx.last_outcome ?? undefined,
				},
			);
			if (
				gate.ok &&
				paths.some((p) => p.replace(/\\/g, "/") === TASK_CLARIFICATION_ARTIFACT)
			) {
				const clarDoc = await readTaskClarificationDoc(runRoot);
				const clarified = String(clarDoc?.clarified_task ?? "").trim();
				if (clarified && runCtx.task_summary !== clarified) {
					runCtx.task_summary = clarified;
				}
				const synced = await syncPlanLastOutcomeFromTaskClarification(
					projectRoot,
					runCtx,
				);
				Object.assign(runCtx, synced);
				persistContext(pi, runCtx);
			}
			if (gate.ok) {
				const sessionId = ctx.sessionManager.getSessionId();
				const completedPhases = new Set<string>();
				for (const rawPath of paths) {
					const norm = rawPath.replace(/\\/g, "/");
					const phase = phaseTerminalArtifact(norm);
					if (!phase || completedPhases.has(phase)) continue;
					const payload = buildPhaseCompletedPayload(runCtx.run_id, phase);
					if (payload) {
						completedPhases.add(phase);
						captureHarnessEvent(sessionId, "harness_phase_completed", {
							...payload,
							harness_plan_id: runCtx.plan_id ?? "plan-unknown",
							pi_session_id: sessionId,
						});
						pi.appendEntry("harness-phase-completed", payload);
					}
				}
				if (
					paths.some(
						(p) => p.replace(/\\/g, "/") === "artifacts/review-outcome.yaml",
					)
				) {
					captureHarnessEvent(sessionId, "harness_run_completed", {
						harness_run_id: runCtx.run_id,
						run_id: runCtx.run_id,
						harness_plan_id: runCtx.plan_id ?? "plan-unknown",
						harness_phase: "evaluate",
						pi_session_id: sessionId,
						source: "review-outcome_gate",
						duration_ms: 0,
						tool_span_count: 0,
						input_tokens: 0,
						output_tokens: 0,
					});
				}
			}

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
}

function registerHarnessRunContextTools(
	pi: ExtensionAPI,
	active: ActiveContextAccess,
) {
	registerHarnessRunContextTool1(pi, active);
	registerHarnessRunContextTool2(pi, active);
	registerHarnessRunContextTool3(pi, active);
	registerHarnessRunContextTool4(pi, active);
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

	pi.events.on("harness-run-aborted", (payload: unknown) => {
		const reason =
			typeof (payload as { reason?: unknown })?.reason === "string"
				? (payload as { reason: string }).reason || "manual abort"
				: "manual abort";
		if (activeCtx) {
			abortActiveRunContext({ pi, activeCtx, reason });
		}
	});

	pi.events.on("harness-runs-cleared", () => {
		activeCtx = null;
	});

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

	pi.on("turn_start", async (_event, ctx) => {
		await handleTurnStart({ pi, ctx, active: activeAccess });
	});

	pi.on("agent_end", async (_event, ctx) => {
		await handleAgentEnd({ pi, ctx, active: activeAccess });
	});

	registerPlanApprovalCapture(pi, activeAccess);
	registerHeadlessPlanProgressWatcher(pi, activeAccess);
	registerExecutorHandoffReconcile(pi, activeAccess);
	registerHarnessToolCallGuards(pi, activeAccess);
	registerHarnessRunStatusCommand(pi, activeAccess);

	registerHarnessClearCommand(pi, activeAccess);
	registerHarnessNewRunCommand(pi, activeAccess);

	registerHarnessPlanCommitCommand(pi, activeAccess);

	registerHarnessRunContextTools(pi, activeAccess);

	registerHarnessUseRunCommand(pi, activeAccess);
}
