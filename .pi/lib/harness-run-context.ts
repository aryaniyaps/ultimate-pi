/**
 * harness-run-context — shared types and helpers for active harness runs.
 *
 * Session entry `harness-run-context` is the live source of truth; disk mirrors:
 * - `.pi/harness/runs/<run_id>/run-context.json`
 * - `.pi/harness/active-run.json` (cross-session pointer)
 */

import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
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

const PLAN_PACKET_BASENAME = "plan-packet.json";

const MUTATING_FILE_TOOLS = new Set(["write", "edit"]);

const PLAN_APPROVE_OPTION =
	/^(approve(d)?(\s+plan)?|yes,?\s+proceed|looks\s+good)$/i;
const PLAN_CANCEL_OPTION =
	/^(cancel(led)?|revise|request\s+changes|needs?\s+clarification)$/i;

export interface PlanUserApproval {
	plan_id: string | null;
	approved_at: string;
	source: "ask_user" | "harness-plan-approval" | "noninteractive";
}

/** Persisted on `input` when user invokes a raw `/harness-*` prompt template. */
export interface HarnessTurnEntry {
	schema_version: "1.0.0";
	command: string;
	args: string;
	source: "slash";
	invoked_at: string;
}

export const HARNESS_COMMAND_PHASE: Record<string, HarnessPhase> = {
	"harness-plan": "plan",
	"harness-auto": "plan",
	"harness-run": "execute",
	"harness-eval": "evaluate",
	"harness-review": "evaluate",
	"harness-critic": "adversary",
	"harness-trace": "evaluate",
	"harness-incident": "evaluate",
	"harness-drift-replan": "plan",
	"harness-drift-proceed": "execute",
	"harness-abort": "plan",
	"harness-new-run": "plan",
	"harness-run-status": "plan",
	"harness-use-run": "plan",
	"harness-policy-status": "merge",
	"harness-router-tune": "plan",
	"harness-budget-status": "plan",
	"harness-setup": "execute",
};

export interface PlanPhaseMutationDecision {
	allowed: boolean;
	reason?: string;
	isScopedPlanWrite?: boolean;
}

/** Resolve path relative to project root when not absolute. */
export function normalizeHarnessPath(
	path: string,
	projectRoot: string,
): string {
	const trimmed = path.trim();
	if (!trimmed) return resolve(projectRoot);
	if (isAbsolute(trimmed)) return resolve(trimmed);
	return resolve(projectRoot, trimmed);
}

export function isCanonicalPlanPacketPath(
	absPath: string,
	projectRoot: string,
	runId: string,
): boolean {
	const expected = resolve(canonicalPlanPath(runId, projectRoot));
	return resolve(absPath) === expected;
}

export function extractWritePathFromToolInput(
	input: Record<string, unknown>,
): string {
	const raw =
		(typeof input.path === "string" && input.path) ||
		(typeof input.filePath === "string" && input.filePath) ||
		"";
	return raw.trim();
}

/** True when absPath is the canonical plan-packet.json for the active run. */
export async function isPlanPhaseScopedWrite(
	absPath: string,
	runCtx: HarnessRunContext | null,
	projectRoot: string,
): Promise<boolean> {
	if (!runCtx?.run_id) return false;
	let resolved: string;
	try {
		resolved = await realpath(normalizeHarnessPath(absPath, projectRoot));
	} catch {
		resolved = normalizeHarnessPath(absPath, projectRoot);
	}
	const runsRoot = resolve(harnessRunsRoot(projectRoot));
	let runsReal: string;
	try {
		runsReal = await realpath(runsRoot);
	} catch {
		runsReal = runsRoot;
	}
	const rel = relative(runsReal, resolved);
	if (rel.startsWith("..") || isAbsolute(rel)) return false;
	const parts = rel.split(/[/\\]/);
	if (parts.length !== 2 || parts[1] !== PLAN_PACKET_BASENAME) return false;
	if (parts[0] !== runCtx.run_id) return false;
	return isCanonicalPlanPacketPath(resolved, projectRoot, runCtx.run_id);
}

export function getLatestHarnessTurn(
	entries: unknown[],
): HarnessTurnEntry | null {
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i] as SessionEntryLike;
		if (entry.type !== "custom" || entry.customType !== "harness-turn") {
			continue;
		}
		const data = entry.data as Partial<HarnessTurnEntry> | undefined;
		if (data?.command && typeof data.command === "string") {
			return {
				schema_version: "1.0.0",
				command: data.command,
				args: typeof data.args === "string" ? data.args : "",
				source: "slash",
				invoked_at:
					typeof data.invoked_at === "string" ? data.invoked_at : nowIso(),
			};
		}
	}
	return null;
}

export function indexOfLastPlanCommand(entries: unknown[]): number {
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i] as SessionEntryLike & {
			message?: { role?: string; content?: string | unknown[] };
		};
		if (entry.type === "custom" && entry.customType === "harness-turn") {
			const cmd = (entry.data as { command?: string })?.command;
			if (cmd === "harness-plan" || cmd === "harness-auto") {
				return i;
			}
		}
		if (
			entry.type === "custom" &&
			entry.customType === "harness-plan-attempt"
		) {
			return i;
		}
		if (entry.type !== "message" || entry.message?.role !== "user") continue;
		const content = entry.message.content;
		const text =
			typeof content === "string"
				? content
				: Array.isArray(content)
					? content
							.filter(
								(c): c is { type: string; text?: string } =>
									typeof c === "object" &&
									c !== null &&
									(c as { type?: string }).type === "text",
							)
							.map((c) => c.text ?? "")
							.join("\n")
					: "";
		const visible = userVisiblePromptSlice(text);
		const parsed = parseHarnessSlashInput(visible);
		if (
			parsed?.command === "harness-plan" ||
			parsed?.command === "harness-auto"
		) {
			return i;
		}
	}
	return -1;
}

export function parseAskUserApprovalFromMessage(msg: {
	toolName?: string;
	details?: unknown;
	content?: { type?: string; text?: string }[];
}): PlanUserApproval | null {
	if (msg.toolName !== "ask_user") return null;
	const details = msg.details as
		| {
				cancelled?: boolean;
				response?: {
					kind?: string;
					text?: string;
					selections?: string[];
				};
		  }
		| undefined;
	if (details?.cancelled) return null;
	const response = details?.response;
	if (!response) return null;
	if (response.kind === "freeform") {
		const text = (response.text ?? "").trim();
		if (/^approve(d)?\b/i.test(text)) {
			return {
				plan_id: null,
				approved_at: nowIso(),
				source: "ask_user",
			};
		}
		return null;
	}
	const selection = (response.selections?.[0] ?? "").trim();
	if (!selection || PLAN_CANCEL_OPTION.test(selection)) return null;
	if (PLAN_APPROVE_OPTION.test(selection)) {
		return {
			plan_id: null,
			approved_at: nowIso(),
			source: "ask_user",
		};
	}
	return null;
}

export function getLatestPlanUserApproval(
	entries: unknown[],
	sinceIndex = 0,
): PlanUserApproval | null {
	for (let i = entries.length - 1; i >= sinceIndex; i--) {
		const entry = entries[i] as SessionEntryLike & {
			message?: {
				role?: string;
				toolName?: string;
				details?: unknown;
				content?: { type?: string; text?: string }[];
			};
		};
		if (
			entry.type === "custom" &&
			entry.customType === "harness-plan-approval"
		) {
			const data = entry.data as Partial<PlanUserApproval> | undefined;
			if (data?.approved_at) {
				return {
					plan_id: typeof data.plan_id === "string" ? data.plan_id : null,
					approved_at: data.approved_at,
					source:
						data.source === "noninteractive"
							? "noninteractive"
							: "harness-plan-approval",
				};
			}
		}
		if (entry.type !== "message" || entry.message?.role !== "toolResult") {
			continue;
		}
		const fromAsk = parseAskUserApprovalFromMessage(entry.message);
		if (fromAsk) return fromAsk;
	}
	return null;
}

export function hasPlanUserApproval(
	entries: unknown[],
	opts?: { planId?: string | null; sincePlanCommand?: boolean },
): boolean {
	if (process.env.HARNESS_PLAN_NONINTERACTIVE === "1") {
		return true;
	}
	const since = opts?.sincePlanCommand
		? Math.max(0, indexOfLastPlanCommand(entries))
		: 0;
	const approval = getLatestPlanUserApproval(entries, since);
	if (!approval) return false;
	if (opts?.planId && approval.plan_id && approval.plan_id !== opts.planId) {
		return false;
	}
	return true;
}

export function isHarnessAutoSession(entries: unknown[]): boolean {
	const since = indexOfLastPlanCommand(entries);
	if (since < 0) return false;
	for (let i = since; i < entries.length; i++) {
		const entry = entries[i] as SessionEntryLike & {
			message?: { role?: string; content?: string };
		};
		if (entry.type !== "message" || entry.message?.role !== "user") continue;
		const text =
			typeof entry.message.content === "string"
				? userVisiblePromptSlice(entry.message.content)
				: "";
		const parsed = parseHarnessSlashInput(text);
		if (parsed?.command === "harness-auto") return true;
	}
	return false;
}

export async function isPlanPhaseAllowedMutation(
	toolName: string,
	input: Record<string, unknown>,
	phase: HarnessPhase,
	runCtx: HarnessRunContext | null,
	projectRoot: string,
	opts: {
		aborted: boolean;
		entries: unknown[];
		ownerSessionId?: string;
		currentSessionId?: string;
	},
): Promise<PlanPhaseMutationDecision> {
	if (!MUTATING_FILE_TOOLS.has(toolName)) {
		if (phase === "execute" || phase === "merge") {
			return { allowed: true };
		}
		return {
			allowed: false,
			reason: `policy-gate: ${toolName} blocked in phase '${phase}'.`,
		};
	}

	if (
		runCtx?.owner_pi_session_id &&
		opts.currentSessionId &&
		runCtx.owner_pi_session_id !== opts.currentSessionId
	) {
		return {
			allowed: false,
			reason:
				"harness-run-context: this session does not own the active run; plan writes are read-only here.",
		};
	}

	const target = extractWritePathFromToolInput(input);
	if (!target) {
		return {
			allowed: false,
			reason: "policy-gate: write/edit requires a path.",
		};
	}

	const scoped = runCtx
		? await isPlanPhaseScopedWrite(target, runCtx, projectRoot)
		: false;

	if (scoped) {
		if (!runCtx) {
			return {
				allowed: false,
				reason:
					'policy-gate: no active harness run. Run /harness-plan "<task>" first.',
			};
		}
		if (
			!hasPlanUserApproval(opts.entries, {
				sincePlanCommand: true,
				planId: runCtx.plan_id,
			})
		) {
			return {
				allowed: false,
				isScopedPlanWrite: true,
				reason:
					"policy-gate: plan-packet.json write blocked until the user approves via ask_user (present the full plan, then Approve).",
			};
		}
		if (opts.aborted) {
			return { allowed: true, isScopedPlanWrite: true };
		}
		if (phase === "plan") {
			return { allowed: true, isScopedPlanWrite: true };
		}
		if (phase === "execute" || phase === "merge") {
			return { allowed: true, isScopedPlanWrite: true };
		}
		return {
			allowed: false,
			isScopedPlanWrite: true,
			reason: `harness-run-context: plan-packet.json is read-only in phase '${phase}'.`,
		};
	}

	if (opts.aborted) {
		return {
			allowed: false,
			reason:
				"policy-gate: mutating tool blocked because harness-abort lock is active. Attach a new approved plan via plan-packet.json first.",
		};
	}

	if (phase === "execute" || phase === "merge") {
		return { allowed: true };
	}

	if (phase === "plan" && !runCtx) {
		return {
			allowed: false,
			reason:
				'policy-gate: no active harness run. Run /harness-plan "<task>" first.',
		};
	}

	const allowedPath = runCtx?.run_id
		? canonicalPlanPath(runCtx.run_id, projectRoot)
		: ".pi/harness/runs/<run_id>/plan-packet.json";
	return {
		allowed: false,
		reason: `policy-gate: ${toolName} blocked in phase '${phase}'. In plan phase only ${allowedPath} is writable after ask_user approval.`,
	};
}

export function allocateRunId(sessionId: string): string {
	return `${sessionId}-${Date.now()}`;
}

export function nowIso(): string {
	return new Date().toISOString();
}

/** @deprecated Use parseHarnessSlashInput on raw `input` event text only. */
export function isHarnessSlashCommand(prompt: string): boolean {
	return parseHarnessSlashInput(prompt) !== null;
}

/** Parse raw user input before prompt-template expansion (`input` hook only). */
export function parseHarnessSlashInput(
	text: string,
): { command: string; args: string } | null {
	const trimmed = text.trim();
	const match = trimmed.match(/^\/(harness-[a-z0-9-]+)(?:\s+([\s\S]*))?$/);
	if (!match) return null;
	const command = match[1];
	if (!HARNESS_COMMANDS.has(command)) return null;
	return { command, args: (match[2] ?? "").trim() };
}

/** @deprecated Prefer parseHarnessSlashInput on raw input; kept for expanded-prompt fallbacks. */
export function parseHarnessSlashCommand(
	prompt: string,
): { command: string; args: string } | null {
	return parseHarnessSlashInput(userVisiblePromptSlice(prompt));
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

export function buildHarnessSpawnContextSnippet(
	ctx: HarnessRunContext,
	opts?: { mode?: "create" | "revise"; risk_level?: string; quick?: boolean },
): string {
	const mode =
		opts?.mode ??
		(ctx.plan_ready || ctx.status === "aborted" ? "revise" : "create");
	return JSON.stringify(
		{
			schema_version: "1.0.0",
			run_id: ctx.run_id,
			plan_packet_path: ctx.plan_packet_path,
			task_summary: ctx.task_summary,
			mode,
			risk_level: opts?.risk_level ?? "med",
			quick: opts?.quick ?? false,
		},
		null,
		2,
	);
}

export function formatPlanContextBlock(
	ctx: HarnessRunContext,
	opts?: { mode?: "create" | "revise"; risk_level?: string; quick?: boolean },
): string {
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
	if (ctx.task_summary) {
		lines.push(`task_summary=${ctx.task_summary}`);
	}
	lines.push(
		`HarnessSpawnContext=${buildHarnessSpawnContextSnippet(ctx, opts)}`,
	);
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
	const absPlan = normalizeHarnessPath(planPath, projectRoot);
	if (!isCanonicalPlanPacketPath(absPlan, projectRoot, runId)) {
		return {
			ok: false,
			reason: `--plan must be runs/${runId}/plan-packet.json (canonical plan packet only)`,
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
	if (!command) return false;
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

export function inferHarnessPhaseFromTurn(entries: unknown[]): HarnessPhase | null {
	const turn = getLatestHarnessTurn(entries);
	if (!turn) return null;
	return HARNESS_COMMAND_PHASE[turn.command] ?? null;
}

/** Prefer session `harness-turn`; fall back to raw slash in visible prompt only. */
export function inferHarnessPhase(
	entries: unknown[],
	userPrompt?: string,
): HarnessPhase {
	const fromTurn = inferHarnessPhaseFromTurn(entries);
	if (fromTurn) return fromTurn;
	if (userPrompt) {
		const parsed = parseHarnessSlashInput(userVisiblePromptSlice(userPrompt));
		if (parsed && HARNESS_COMMAND_PHASE[parsed.command]) {
			return HARNESS_COMMAND_PHASE[parsed.command];
		}
	}
	return "execute";
}

/** @deprecated Use inferHarnessPhase(entries, prompt) — substring matching causes false plan phase. */
export function inferHarnessPhaseFromPrompt(prompt: string): HarnessPhase {
	const p = userVisiblePromptSlice(prompt).toLowerCase();
	const parsed = parseHarnessSlashInput(userVisiblePromptSlice(prompt));
	if (parsed && HARNESS_COMMAND_PHASE[parsed.command]) {
		return HARNESS_COMMAND_PHASE[parsed.command];
	}
	if (p.startsWith("/harness-plan") || p.startsWith("/harness-auto")) {
		return "plan";
	}
	if (p.startsWith("/harness-run")) return "execute";
	if (p.startsWith("/harness-eval") || p.startsWith("/harness-review")) {
		return "evaluate";
	}
	if (p.startsWith("/harness-critic")) return "adversary";
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
		phase: "plan",
		approvedPlan: false,
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
	const nextPhase = inferHarnessPhase(entries, userPrompt);
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
	const cmd = parseHarnessSlashInput(userVisiblePromptSlice(prompt));
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
			return "/harness-eval";
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

/** Collect plan approvals from a session entry list (e.g. subagent in-memory session). */
export function extractPlanApprovalsFromEntries(
	entries: unknown[],
): PlanUserApproval[] {
	const out: PlanUserApproval[] = [];
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i] as SessionEntryLike & {
			message?: {
				role?: string;
				toolName?: string;
				details?: unknown;
				content?: { type?: string; text?: string }[];
			};
		};
		if (entry.type !== "message" || entry.message?.role !== "toolResult") {
			continue;
		}
		const fromAsk = parseAskUserApprovalFromMessage(entry.message);
		if (fromAsk) out.push(fromAsk);
	}
	return out;
}
