/**
 * harness-run-context — shared types and helpers for active harness runs.
 *
 * Session entry `harness-run-context` is the live source of truth; disk mirrors:
 * - `.pi/harness/runs/<run_id>/run-context.json`
 * - `.pi/harness/active-run.json` (cross-session pointer)
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

export type HarnessPhase =
	| "plan"
	| "execute"
	| "evaluate"
	| "adversary"
	| "merge";

export type HarnessRunStatus = "active" | "aborted" | "completed";

export interface HarnessRunContext {
	schema_version: "1.0.0";
	run_id: string;
	pi_session_id: string;
	project_root: string;
	phase: HarnessPhase;
	plan_id: string | null;
	plan_packet_path: string | null;
	plan_ready: boolean;
	task_summary: string | null;
	status: HarnessRunStatus;
	last_completed_step: string | null;
	last_outcome: string | null;
	next_recommended_command: string | null;
	owner_pi_session_id: string;
	updated_at: string;
	harness_run_started_emitted?: boolean;
	turn_override_run_id?: string | null;
}

export interface ProjectActiveRunPointer {
	schema_version: "1.0.0";
	run_id: string;
	project_root: string;
	owner_pi_session_id: string;
	phase: HarnessPhase;
	plan_id: string | null;
	plan_ready: boolean;
	updated_at: string;
}

export interface PlanPacketSummary {
	plan_id: string;
	plan_packet_path: string;
	scope_one_liner: string;
	acceptance_check_count: number;
	plan_status: string;
}

export interface PlanPacketLike {
	schema_version?: string;
	contract_version?: string;
	plan_id?: string;
	task_id?: string;
	scope?: string;
	acceptance_checks?: unknown[];
	risk_level?: string;
	assumptions?: unknown[];
	rollback_plan?: unknown;
}

interface SessionEntryLike {
	type?: string;
	customType?: string;
	data?: unknown;
}

const SCHEMA_VERSION = "1.0.0" as const;

const HARNESS_COMMANDS = new Set([
	"harness-plan",
	"harness-run",
	"harness-eval",
	"harness-review",
	"harness-critic",
	"harness-trace",
	"harness-incident",
	"harness-abort",
	"harness-auto",
	"harness-new-run",
	"harness-run-status",
	"harness-use-run",
	"harness-drift-replan",
	"harness-drift-proceed",
	"harness-policy-status",
	"harness-trace-last",
	"harness-router-tune",
	"harness-budget-status",
]);

export function harnessRunsRoot(projectRoot: string): string {
	return join(projectRoot, ".pi", "harness", "runs");
}

export function activeRunPointerPath(projectRoot: string): string {
	return join(projectRoot, ".pi", "harness", "active-run.json");
}

export function runContextDiskPath(runId: string, projectRoot: string): string {
	return join(harnessRunsRoot(projectRoot), runId, "run-context.json");
}

export function canonicalPlanPath(runId: string, projectRoot: string): string {
	return join(harnessRunsRoot(projectRoot), runId, "plan-packet.json");
}

export function allocateRunId(sessionId: string): string {
	return `${sessionId}-${Date.now()}`;
}

export function nowIso(): string {
	return new Date().toISOString();
}

export function isHarnessSlashCommand(prompt: string): boolean {
	const trimmed = prompt.trim();
	if (!trimmed.startsWith("/harness-")) return false;
	const match = trimmed.match(/^\/(harness-[a-z0-9-]+)/);
	if (!match) return false;
	return HARNESS_COMMANDS.has(match[1]);
}

export function parseHarnessSlashCommand(
	prompt: string,
): { command: string; args: string } | null {
	const trimmed = prompt.trim();
	const match = trimmed.match(/^\/(harness-[a-z0-9-]+)(?:\s+([\s\S]*))?$/);
	if (!match) return null;
	const command = match[1];
	if (!HARNESS_COMMANDS.has(command)) return null;
	return { command, args: (match[2] ?? "").trim() };
}

/** User-visible prompt slice for policy signals (exclude injected blocks). */
export function userVisiblePromptSlice(prompt: string): string {
	const markers = [
		"\n\n[HarnessRunContext]",
		"\n\n[HarnessActivePlan]",
		"\n\n[PolicyGate]",
	];
	let slice = prompt;
	for (const marker of markers) {
		const idx = slice.indexOf(marker);
		if (idx >= 0) slice = slice.slice(0, idx);
	}
	return slice.trim();
}

export function hasApprovedPlanSignalFromUserPrompt(prompt: string): boolean {
	const p = userVisiblePromptSlice(prompt).toLowerCase();
	return (
		p.includes("planpacket") ||
		p.includes("approved plan") ||
		/\bplan_id\s*[=:]/i.test(p)
	);
}

export function isDriftReplanPrompt(prompt: string): boolean {
	const p = userVisiblePromptSlice(prompt).toLowerCase();
	return (
		p.includes("harness-drift-replan") ||
		p.includes("/harness-drift-replan") ||
		p.includes("drift-replan")
	);
}

export function getLatestRunContext(
	entries: unknown[],
): HarnessRunContext | null {
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i] as SessionEntryLike;
		if (entry.type !== "custom" || entry.customType !== "harness-run-context")
			continue;
		const ctx = entry.data as Partial<HarnessRunContext> | undefined;
		if (ctx?.run_id && ctx.project_root) {
			return normalizeRunContext(ctx);
		}
	}
	return null;
}

function normalizeRunContext(
	partial: Partial<HarnessRunContext>,
): HarnessRunContext {
	return {
		schema_version: SCHEMA_VERSION,
		run_id: partial.run_id!,
		pi_session_id: partial.pi_session_id ?? partial.run_id!,
		project_root: partial.project_root!,
		phase: partial.phase ?? "plan",
		plan_id: partial.plan_id ?? null,
		plan_packet_path: partial.plan_packet_path ?? null,
		plan_ready: Boolean(partial.plan_ready),
		task_summary: partial.task_summary ?? null,
		status: partial.status ?? "active",
		last_completed_step: partial.last_completed_step ?? null,
		last_outcome: partial.last_outcome ?? null,
		next_recommended_command: partial.next_recommended_command ?? null,
		owner_pi_session_id:
			partial.owner_pi_session_id ?? partial.pi_session_id ?? partial.run_id!,
		updated_at: partial.updated_at ?? nowIso(),
		harness_run_started_emitted: partial.harness_run_started_emitted,
		turn_override_run_id: partial.turn_override_run_id ?? null,
	};
}

export function createFreshRunContext(
	sessionId: string,
	projectRoot: string,
	taskSummary: string | null = null,
): HarnessRunContext {
	const runId = allocateRunId(sessionId);
	const ts = nowIso();
	return {
		schema_version: SCHEMA_VERSION,
		run_id: runId,
		pi_session_id: sessionId,
		project_root: projectRoot,
		phase: "plan",
		plan_id: null,
		plan_packet_path: canonicalPlanPath(runId, projectRoot),
		plan_ready: false,
		task_summary: taskSummary,
		status: "active",
		last_completed_step: null,
		last_outcome: null,
		next_recommended_command: null,
		owner_pi_session_id: sessionId,
		updated_at: ts,
		harness_run_started_emitted: false,
		turn_override_run_id: null,
	};
}

export async function loadRunContextFromDisk(
	runId: string,
	projectRoot: string,
): Promise<HarnessRunContext | null> {
	try {
		const raw = await readFile(runContextDiskPath(runId, projectRoot), "utf-8");
		return normalizeRunContext(JSON.parse(raw) as Partial<HarnessRunContext>);
	} catch {
		return null;
	}
}

export async function saveRunContextToDisk(
	ctx: HarnessRunContext,
): Promise<void> {
	const dir = join(harnessRunsRoot(ctx.project_root), ctx.run_id);
	await mkdir(dir, { recursive: true });
	await writeFile(
		runContextDiskPath(ctx.run_id, ctx.project_root),
		`${JSON.stringify(ctx, null, 2)}\n`,
		"utf-8",
	);
}

export async function loadProjectActiveRun(
	projectRoot: string,
): Promise<ProjectActiveRunPointer | null> {
	try {
		const raw = await readFile(activeRunPointerPath(projectRoot), "utf-8");
		return JSON.parse(raw) as ProjectActiveRunPointer;
	} catch {
		return null;
	}
}

export async function saveProjectActiveRun(
	ctx: HarnessRunContext,
): Promise<void> {
	const pointer: ProjectActiveRunPointer = {
		schema_version: SCHEMA_VERSION,
		run_id: ctx.run_id,
		project_root: ctx.project_root,
		owner_pi_session_id: ctx.owner_pi_session_id,
		phase: ctx.phase,
		plan_id: ctx.plan_id,
		plan_ready: ctx.plan_ready,
		updated_at: ctx.updated_at,
	};
	await mkdir(join(ctx.project_root, ".pi", "harness"), {
		recursive: true,
	});
	await writeFile(
		activeRunPointerPath(ctx.project_root),
		`${JSON.stringify(pointer, null, 2)}\n`,
		"utf-8",
	);
}

export function activeRunTtlHours(): number {
	const raw = Number(process.env.HARNESS_ACTIVE_RUN_TTL_HOURS ?? "72");
	return Number.isFinite(raw) && raw > 0 ? raw : 72;
}

export function isStaleActiveRunPointer(
	pointer: ProjectActiveRunPointer,
	currentProjectRoot: string,
): boolean {
	if (resolve(pointer.project_root) !== resolve(currentProjectRoot)) {
		return true;
	}
	const ageMs = Date.now() - Date.parse(pointer.updated_at);
	if (!Number.isFinite(ageMs)) return true;
	return ageMs > activeRunTtlHours() * 60 * 60 * 1000;
}

export async function readPlanPacketFromPath(
	planPath: string,
): Promise<PlanPacketLike | null> {
	try {
		const raw = await readFile(planPath, "utf-8");
		return JSON.parse(raw) as PlanPacketLike;
	} catch {
		return null;
	}
}

export function validatePlanPacket(packet: PlanPacketLike | null): {
	valid: boolean;
	errors: string[];
} {
	if (!packet)
		return { valid: false, errors: ["plan file missing or unreadable"] };
	const errors: string[] = [];
	if (packet.schema_version !== "1.0.0")
		errors.push("schema_version must be 1.0.0");
	if (packet.contract_version !== "1.0.0")
		errors.push("contract_version must be 1.0.0");
	if (!packet.plan_id || typeof packet.plan_id !== "string")
		errors.push("plan_id required");
	if (!packet.task_id || typeof packet.task_id !== "string")
		errors.push("task_id required");
	if (!packet.scope || typeof packet.scope !== "string")
		errors.push("scope required");
	if (
		!Array.isArray(packet.acceptance_checks) ||
		packet.acceptance_checks.length < 1
	)
		errors.push("acceptance_checks required");
	if (!packet.risk_level) errors.push("risk_level required");
	if (!packet.rollback_plan) errors.push("rollback_plan required");
	return { valid: errors.length === 0, errors };
}

export function planPacketSummary(
	packet: PlanPacketLike,
	planPath: string,
	planStatus = "ready",
): PlanPacketSummary {
	const scope = typeof packet.scope === "string" ? packet.scope : "(no scope)";
	const oneLiner = scope.length > 120 ? `${scope.slice(0, 117)}...` : scope;
	return {
		plan_id: String(packet.plan_id ?? "unknown"),
		plan_packet_path: planPath,
		scope_one_liner: oneLiner,
		acceptance_check_count: Array.isArray(packet.acceptance_checks)
			? packet.acceptance_checks.length
			: 0,
		plan_status: planStatus,
	};
}

export function formatPlanContextBlock(ctx: HarnessRunContext): string {
	const lines = [
		"[HarnessRunContext]",
		`run_id=${ctx.run_id}`,
		`phase=${ctx.phase}`,
		`status=${ctx.status}`,
		`plan_ready=${ctx.plan_ready}`,
		`plan_id=${ctx.plan_id ?? "none"}`,
		`last_completed_step=${ctx.last_completed_step ?? "none"}`,
		`last_outcome=${ctx.last_outcome ?? "none"}`,
		`next_recommended_command=${ctx.next_recommended_command ?? "none"}`,
	];
	if (ctx.plan_packet_path) {
		lines.push(`plan_packet_path=${ctx.plan_packet_path}`);
	}
	return lines.join("\n");
}

export function formatActivePlanBlock(
	ctx: HarnessRunContext,
	mode: "create" | "revise" | "execute" | "read",
	summary?: PlanPacketSummary | null,
): string {
	const lines = ["[HarnessActivePlan]"];
	if (mode === "create") {
		lines.push(
			"No prior PlanPacket on disk. Create PlanPacket at the canonical path below.",
		);
	} else if (mode === "revise") {
		lines.push(
			"Read the current PlanPacket from disk first, then revise per the user task.",
		);
		if (ctx.status === "aborted") {
			lines.push(
				"Prior run was aborted; treat this as replan/amend of prior scope.",
			);
		}
	} else if (mode === "execute") {
		lines.push(
			"Load PlanPacket from plan_packet_path and execute it. Do not parse --plan from user input on the happy path.",
		);
	} else {
		lines.push(
			"Plan is read-only in this phase. Do not edit plan-packet.json.",
		);
	}
	if (ctx.plan_packet_path) {
		lines.push(`plan_packet_path=${ctx.plan_packet_path}`);
	}
	if (ctx.task_summary) lines.push(`task_summary=${ctx.task_summary}`);
	if (summary) {
		lines.push(`plan_id=${summary.plan_id}`);
		lines.push(`scope=${summary.scope_one_liner}`);
		lines.push(`acceptance_checks=${summary.acceptance_check_count}`);
		lines.push(`plan_status=${summary.plan_status}`);
	}
	return lines.join("\n");
}

export function parseArgFlag(args: string, flag: string): string | null {
	const re = new RegExp(`${flag}\\s+("([^"]+)"|(\\S+))`);
	const m = args.match(re);
	if (!m) return null;
	return m[2] ?? m[3] ?? null;
}

export function resolveArgsForCommand(
	command: string,
	args: string,
	ctx: HarnessRunContext | null,
): { runId: string | null; planPath: string | null; overrideRun: boolean } {
	let runId = ctx?.run_id ?? null;
	let planPath = ctx?.plan_packet_path ?? null;
	let overrideRun = false;

	const explicitRun = parseArgFlag(args, "--run");
	if (explicitRun) {
		runId = explicitRun;
		overrideRun = true;
	}
	const explicitPlan = parseArgFlag(args, "--plan");
	if (explicitPlan) {
		planPath = explicitPlan;
	}

	if (command === "harness-use-run" && args.trim()) {
		runId = args.trim().split(/\s+/)[0] ?? runId;
		overrideRun = true;
	}

	return { runId, planPath, overrideRun };
}

export function validatePlanOverridePath(
	planPath: string,
	runId: string,
	projectRoot: string,
): { ok: boolean; reason?: string } {
	const absPlan = resolve(planPath);
	const runsDir = resolve(harnessRunsRoot(projectRoot), runId);
	const rel = relative(runsDir, absPlan);
	if (rel.startsWith("..") || isAbsolute(rel)) {
		return {
			ok: false,
			reason: `--plan must be under runs/${runId}/ or use /harness-use-run to switch runs`,
		};
	}
	return { ok: true };
}

export function getRunIdFromSession(
	entries: unknown[],
	sessionId: string,
): string | null {
	const ctx = getLatestRunContext(entries);
	if (ctx?.turn_override_run_id) return ctx.turn_override_run_id;
	if (ctx?.status === "active" || ctx?.status === "aborted") return ctx.run_id;
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i] as SessionEntryLike;
		if (entry.type !== "custom" || entry.customType !== "harness-trace-state")
			continue;
		const runId = (entry.data as { run_id?: string })?.run_id;
		if (typeof runId === "string" && runId.length > 0) return runId;
	}
	return null;
}

export function shouldReuseHarnessRunId(
	prompt: string,
	ctx: HarnessRunContext | null,
	command: string | null,
): boolean {
	if (!command || !isHarnessSlashCommand(prompt)) return false;
	if (command === "harness-new-run") return false;
	if (!ctx) return false;
	if (command === "harness-plan" || command === "harness-auto") {
		return ctx.status === "active" || ctx.status === "aborted";
	}
	if (ctx.status === "active") return true;
	return Boolean(ctx.run_id);
}

const HARNESS_PHASE_ORDER: HarnessPhase[] = [
	"plan",
	"execute",
	"evaluate",
	"adversary",
	"merge",
];

export interface HarnessPolicyState {
	phase: HarnessPhase;
	approvedPlan: boolean;
	planId: string | null;
	aborted: boolean;
}

export function inferHarnessPhaseFromPrompt(prompt: string): HarnessPhase {
	const p = prompt.toLowerCase();
	if (
		p.includes("/harness-plan") ||
		p.includes("harness-plan") ||
		p.includes("/harness-auto") ||
		p.includes("harness-auto")
	) {
		return "plan";
	}
	if (p.includes("/harness-run") || p.includes("harness-run")) return "execute";
	if (p.includes("/harness-eval") || p.includes("harness-eval")) {
		return "evaluate";
	}
	if (p.includes("/harness-review") || p.includes("harness-review")) {
		return "evaluate";
	}
	if (p.includes("/harness-critic") || p.includes("harness-critic")) {
		return "adversary";
	}
	if (p.includes("adversary")) return "adversary";
	if (p.includes("merge gate") || p.includes("policy decision")) return "merge";
	return "execute";
}

export function isValidHarnessPhaseTransition(
	from: HarnessPhase,
	to: HarnessPhase,
): boolean {
	if (from === to) return true;
	if (to === "plan") return true;
	if (to === "execute") return true;
	const fromIndex = HARNESS_PHASE_ORDER.indexOf(from);
	const toIndex = HARNESS_PHASE_ORDER.indexOf(to);
	return toIndex === fromIndex + 1;
}

export function getLatestPolicyState(entries: unknown[]): HarnessPolicyState {
	const fallback: HarnessPolicyState = {
		phase: "execute",
		approvedPlan: true,
		planId: null,
		aborted: false,
	};
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i] as SessionEntryLike;
		if (
			entry.type !== "custom" ||
			entry.customType !== "harness-policy-state"
		) {
			continue;
		}
		const candidate = entry.data as Partial<HarnessPolicyState> | undefined;
		if (
			candidate &&
			typeof candidate.phase === "string" &&
			HARNESS_PHASE_ORDER.includes(candidate.phase as HarnessPhase)
		) {
			return {
				phase: candidate.phase as HarnessPhase,
				approvedPlan: Boolean(candidate.approvedPlan),
				planId: typeof candidate.planId === "string" ? candidate.planId : null,
				aborted: Boolean(candidate.aborted),
			};
		}
	}
	return fallback;
}

export function isHarnessBootstrapPrompt(prompt: string): boolean {
	const p = prompt.toLowerCase();
	return (
		p.includes("/harness-setup") ||
		p.includes("harness-setup") ||
		p.includes("full harness bootstrap")
	);
}

export function hasHarnessAbortSignal(prompt: string): boolean {
	const p = prompt.toLowerCase();
	return p.includes("/harness-abort") || p.includes("harness-abort");
}

/** Mirrors policy-gate phase checks so run-context does not inject on blocked turns. */
export function getPolicyTransitionBlock(
	userPrompt: string,
	entries: unknown[],
): { blocked: boolean; message?: string } {
	if (
		isHarnessBootstrapPrompt(userPrompt) ||
		hasHarnessAbortSignal(userPrompt)
	) {
		return { blocked: false };
	}
	const state = getLatestPolicyState(entries);
	const nextPhase = inferHarnessPhaseFromPrompt(userPrompt);
	if (!isValidHarnessPhaseTransition(state.phase, nextPhase)) {
		return {
			blocked: true,
			message: [
				`Policy gate blocked invalid phase transition: ${state.phase} -> ${nextPhase}.`,
				"Run /harness-plan first or continue in the current phase.",
			].join("\n"),
		};
	}
	if (nextPhase === "execute" && !state.approvedPlan) {
		const runCtx = getLatestRunContext(entries);
		if (
			!runCtx?.plan_ready &&
			!hasApprovedPlanSignalFromUserPrompt(userPrompt)
		) {
			return {
				blocked: true,
				message:
					"Policy gate blocked execute: no approved plan in active run context. Run /harness-plan first.",
			};
		}
	}
	return { blocked: false };
}

export function isAmendPlanAllowed(
	ctx: HarnessRunContext | null,
	prompt: string,
	driftGateActive: boolean,
): boolean {
	if (!ctx || ctx.status === "aborted") return true;
	if (ctx.last_outcome === "needs_clarification") return true;
	if (isDriftReplanPrompt(prompt)) return true;
	if (driftGateActive) return true;
	return false;
}

export function isNewTaskPlanBlocked(
	ctx: HarnessRunContext,
	prompt: string,
): boolean {
	if (ctx.status !== "active") return false;
	if (isAmendPlanAllowed(ctx, prompt, false)) return false;
	const cmd = parseHarnessSlashCommand(prompt);
	if (cmd?.command !== "harness-plan") return false;
	const taskMatch = prompt.match(/"([^"]+)"/);
	if (!taskMatch || !ctx.task_summary) return true;
	const newTask = taskMatch[1].trim().toLowerCase();
	const prior = ctx.task_summary.trim().toLowerCase();
	if (newTask === prior) return false;
	return newTask.length > 0 && prior.length > 0;
}

export function nextStepAfterOutcome(input: {
	phase: HarnessPhase;
	planStatus?: string | null;
	executionStatus?: string | null;
	evalStatus?: string | null;
	policyDecision?: string | null;
	aborted?: boolean;
}): string {
	if (input.aborted) {
		return '/harness-plan "<task>"';
	}
	const plan = (input.planStatus ?? "").toLowerCase();
	if (plan === "needs_clarification") {
		return "Reply with answers or run /harness-plan with updates";
	}
	if (input.phase === "plan" && plan === "ready") return "/harness-run";
	if (input.phase === "execute") {
		const exec = (input.executionStatus ?? "").toLowerCase();
		if (exec === "blocked" || exec === "scope_drift") {
			return "/harness-plan or /harness-abort";
		}
		if (exec === "completed") {
			return "New Pi session → /harness-eval";
		}
	}
	if (input.phase === "evaluate") {
		const ev = (input.evalStatus ?? "").toLowerCase();
		if (ev === "fail") return "/harness-plan or /harness-incident";
		return "/harness-review";
	}
	if (input.phase === "adversary") return "/harness-policy-status";
	if (input.phase === "merge") return "/harness-policy-status";
	return "/harness-run-status";
}

export function extractCompletionStatuses(entries: unknown[]): {
	planStatus: string | null;
	executionStatus: string | null;
	evalStatus: string | null;
} {
	let planStatus: string | null = null;
	let executionStatus: string | null = null;
	let evalStatus: string | null = null;

	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i] as SessionEntryLike;
		if (entry.type !== "custom") continue;
		if (entry.customType === "harness-plan-packet") {
			const d = entry.data as { plan_status?: string };
			if (!planStatus && typeof d?.plan_status === "string") {
				planStatus = d.plan_status;
			}
		}
		if (entry.customType === "harness-step-handoff") {
			const d = entry.data as {
				plan_status?: string;
				execution_status?: string;
				eval_status?: string;
			};
			if (!planStatus && typeof d?.plan_status === "string")
				planStatus = d.plan_status;
			if (!executionStatus && typeof d?.execution_status === "string")
				executionStatus = d.execution_status;
			if (!evalStatus && typeof d?.eval_status === "string")
				evalStatus = d.eval_status;
		}
	}
	return { planStatus, executionStatus, evalStatus };
}

export function getLatestPolicyPhase(entries: unknown[]): HarnessPhase | null {
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i] as SessionEntryLike;
		if (entry.type !== "custom" || entry.customType !== "harness-policy-state")
			continue;
		const phase = (entry.data as { phase?: string })?.phase;
		if (
			phase === "plan" ||
			phase === "execute" ||
			phase === "evaluate" ||
			phase === "adversary" ||
			phase === "merge"
		) {
			return phase;
		}
	}
	return null;
}

export function driftGateActive(entries: unknown[]): boolean {
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i] as SessionEntryLike;
		if (entry.type !== "custom" || entry.customType !== "harness-drift-report")
			continue;
		const score = Number(
			(entry.data as { drift_score?: number })?.drift_score ?? 0,
		);
		const ack = Boolean(
			(entry.data as { user_acknowledged?: boolean })?.user_acknowledged,
		);
		if (
			score >= Number(process.env.HARNESS_DRIFT_THRESHOLD ?? "0.65") &&
			!ack
		) {
			return true;
		}
	}
	return false;
}

export function phaseTraceFileName(phase: HarnessPhase): string {
	return `trace-${phase}.json`;
}
