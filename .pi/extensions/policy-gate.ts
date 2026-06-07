/**
 * policy-gate — plan-before-mutate and phase enforcement.
 *
 * Pi-compatible patterns:
 * - default extension factory
 * - state persisted via pi.appendEntry()
 * - enforcement via before_agent_start + tool_call hooks
 * - command surface via pi.registerCommand()
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isHarnessAgtPolicyEnabled } from "../lib/agt/config.js";
import { evaluateAgtHarnessToolCall } from "../lib/harness-agt-tool-guard.js";
import { isHarnessProjectEnabled } from "../lib/harness-project-config.js";
import {
	extractWritePathFromToolInput,
	getLatestRunContext,
	getPolicyTransitionBlock,
	hasApprovedPlanSignalFromUserPrompt,
	hasHarnessAbortSignal,
	inferHarnessPhase,
	isHarnessAutoSession,
	isHarnessBootstrapPrompt,
	isPlanPhaseAllowedMutation,
	isPlanPhaseScopedWrite,
	normalizeHarnessPath,
	parseHarnessSlashInput,
	readPlanPacketFromPath,
	saveProjectActiveRun,
	saveRunContextToDisk,
	userVisiblePromptSlice,
	validatePlanPacket,
} from "../lib/harness-run-context.js";
import { bootstrapHarnessSubprocessFromEnv } from "../lib/harness-subprocess-bootstrap.js";

type HarnessPhase = "plan" | "execute" | "evaluate" | "adversary" | "merge";

interface PolicyState {
	phase: HarnessPhase;
	approvedPlan: boolean;
	planId: string | null;
	budgetBypass: boolean;
	aborted: boolean;
	abortReason: string | null;
	abortedAt: string | null;
	updatedAt: string;
}

interface SessionEntryLike {
	type?: string;
	customType?: string;
	data?: unknown;
}

const PHASE_ORDER: HarnessPhase[] = [
	"plan",
	"execute",
	"evaluate",
	"adversary",
	"merge",
];

// @ts-expect-error pi extensions run as ESM
const MODULE_URL = import.meta.url;

const MUTATING_TOOLS = new Set(["write", "edit"]);

function nowIso(): string {
	return new Date().toISOString();
}

function defaultState(): PolicyState {
	return {
		phase: "plan",
		approvedPlan: false,
		planId: null,
		budgetBypass: false,
		aborted: false,
		abortReason: null,
		abortedAt: null,
		updatedAt: nowIso(),
	};
}

function hasApprovedPlanSignal(prompt: string, entries: unknown[]): boolean {
	const runCtx = getLatestRunContext(entries);
	if (runCtx?.plan_ready) return true;
	return hasApprovedPlanSignalFromUserPrompt(prompt);
}

function getLatestPolicyStateFull(ctx: {
	sessionManager: { getEntries(): unknown[] };
}): PolicyState {
	const entries = ctx.sessionManager.getEntries() as SessionEntryLike[];
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (
			entry.type !== "custom" ||
			entry.customType !== "harness-policy-state"
		) {
			continue;
		}
		const candidate = entry.data as Partial<PolicyState> | undefined;
		if (
			candidate &&
			typeof candidate.phase === "string" &&
			PHASE_ORDER.includes(candidate.phase as HarnessPhase)
		) {
			return {
				phase: candidate.phase as HarnessPhase,
				approvedPlan: Boolean(candidate.approvedPlan),
				planId: typeof candidate.planId === "string" ? candidate.planId : null,
				budgetBypass: Boolean(candidate.budgetBypass),
				aborted: Boolean(candidate.aborted),
				abortReason:
					typeof candidate.abortReason === "string"
						? candidate.abortReason
						: null,
				abortedAt:
					typeof candidate.abortedAt === "string" ? candidate.abortedAt : null,
				updatedAt:
					typeof candidate.updatedAt === "string"
						? candidate.updatedAt
						: nowIso(),
			};
		}
	}
	return defaultState();
}

async function handlePolicySessionStart(
	pi: ExtensionAPI,
	stateRef: { current: PolicyState },
	ctx: any,
): Promise<void> {
	stateRef.current = getLatestPolicyStateFull(ctx);
	const booted = await bootstrapHarnessSubprocessFromEnv(pi, ctx);
	if (booted) {
		stateRef.current = getLatestPolicyStateFull(ctx);
	}
}

async function handlePolicyBeforeAgentStart(args: {
	pi: ExtensionAPI;
	stateRef: { current: PolicyState };
	event: any;
	ctx: any;
}) {
	const { pi, stateRef, event, ctx } = args;
	const userPrompt = userVisiblePromptSlice(event.prompt);
	await bootstrapHarnessSubprocessFromEnv(pi, ctx);
	const entries = ctx.sessionManager.getEntries();
	const state = getLatestPolicyStateFull(ctx);
	const bootstrapPrompt = isHarnessBootstrapPrompt(userPrompt);
	const abortSignal = hasHarnessAbortSignal(userPrompt);

	const parsed = parseHarnessSlashInput(userPrompt);
	const isHarnessClear = parsed?.command === "harness-clear";

	if (bootstrapPrompt) {
		state.phase = "execute";
		state.approvedPlan = true;
		stateRef.current.planId = null;
		state.budgetBypass = true;
		state.aborted = false;
		state.abortReason = null;
		state.abortedAt = null;
		state.updatedAt = nowIso();
		stateRef.current = state;
		pi.appendEntry("harness-policy-state", stateRef.current);
		return {
			systemPrompt: `${event.systemPrompt}\n\n[PolicyGate]\nPhase=${state.phase}; ApprovedPlan=${state.approvedPlan}; PlanId=${state.planId ?? "none"}; Aborted=${state.aborted}; Bootstrap=harness-setup.`,
		};
	}

	if (abortSignal) {
		stateRef.current.phase = "plan";
		stateRef.current.approvedPlan = false;
		stateRef.current.planId = null;
		stateRef.current.budgetBypass = false;
		stateRef.current.aborted = true;
		state.abortReason = "harness-abort command";
		stateRef.current.abortedAt = nowIso();
		stateRef.current.updatedAt = stateRef.current.abortedAt;
		stateRef.current = state;
		pi.appendEntry("harness-policy-state", stateRef.current);
		pi.events.emit("harness-run-aborted", {
			reason: state.abortReason,
			abortedAt: stateRef.current.abortedAt,
		});
		return {
			message: {
				customType: "harness-policy-aborted",
				display: true,
				content: [
					"Harness run aborted safely.",
					"Mutating tools are now blocked until a new approved plan is attached.",
					'Next step: /harness-plan "<task>" or /harness-auto "<task>"',
				].join("\n"),
			},
			systemPrompt: `${event.systemPrompt}\n\n[PolicyGate]\nAbort lock active. Mutating tools must remain blocked until a new approved plan is attached.`,
		};
	}

	if (
		parsed?.command === "harness-plan" ||
		parsed?.command === "harness-auto"
	) {
		stateRef.current.aborted = false;
		stateRef.current.abortReason = null;
		stateRef.current.abortedAt = null;
	}

	const nextPhase = inferHarnessPhase(entries, userPrompt);
	const planSignal = hasApprovedPlanSignal(userPrompt, entries);
	const transitionBlock = getPolicyTransitionBlock(userPrompt, entries);
	if (transitionBlock.blocked) {
		return {
			message: {
				customType: "harness-policy-violation",
				display: true,
				content: transitionBlock.message ?? "Policy gate blocked this command.",
			},
		};
	}

	if (nextPhase === "plan" || isHarnessClear) {
		stateRef.current.approvedPlan = false;
		stateRef.current.planId = null;
	}
	if (nextPhase === "execute" && !state.approvedPlan && !planSignal) {
		const runCtx = getLatestRunContext(entries);
		if (runCtx?.plan_ready) {
			state.approvedPlan = true;
			state.planId = runCtx.plan_id ?? state.planId;
		}
	}
	if (planSignal) {
		state.approvedPlan = true;
		const planMatch = userPrompt.match(
			/plan[_-]?id["'\s:=]+([A-Za-z0-9._:-]+)/i,
		);
		state.planId = planMatch?.[1] ?? state.planId;
		state.aborted = false;
		state.abortReason = null;
		state.abortedAt = null;
	}
	state.budgetBypass = bootstrapPrompt;
	state.phase = nextPhase;
	state.updatedAt = nowIso();
	stateRef.current = state;
	pi.appendEntry("harness-policy-state", stateRef.current);

	const planPhaseHint =
		state.phase === "plan"
			? "\nPlan phase: scouts (parallel) → decompose → hypothesis (sequential) → implementation-researcher + stack-researcher (parallel) → execution-plan-author → validate-plan-dag → debate eligibility + Review Gate → approve_plan → create_plan (YAML plan-packet.yaml). Post-execute: /harness-review."
			: "";
	return {
		systemPrompt: `${event.systemPrompt}\n\n[PolicyGate]\nPhase=${state.phase}; ApprovedPlan=${state.approvedPlan}; PlanId=${state.planId ?? "none"}; Aborted=${state.aborted}.${planPhaseHint}`,
	};
}

async function handlePolicyToolCall(args: {
	stateRef: { current: PolicyState };
	event: any;
	ctx: any;
}) {
	const state = getLatestPolicyStateFull(args.ctx);
	args.stateRef.current = state;
	const entries = args.ctx.sessionManager.getEntries();
	const projectRoot = process.cwd();
	const sessionId = args.ctx.sessionManager.getSessionId();

	if (isHarnessAgtPolicyEnabled()) {
		return evaluateAgtHarnessToolCall({
			moduleUrl: MODULE_URL,
			toolName: args.event.toolName,
			toolInput: args.event.input as Record<string, unknown>,
			policyState: state,
			entries,
			sessionId,
			projectRoot,
		});
	}

	const runCtx = getLatestRunContext(entries);
	if (MUTATING_TOOLS.has(args.event.toolName)) {
		const decision = await isPlanPhaseAllowedMutation(
			args.event.toolName,
			args.event.input as Record<string, unknown>,
			state.phase,
			runCtx,
			projectRoot,
			{
				aborted: state.aborted,
				entries,
				ownerSessionId: runCtx?.owner_pi_session_id,
				currentSessionId: sessionId,
			},
		);
		if (!decision.allowed) return { block: true, reason: decision.reason };
		return undefined;
	}

	if (args.event.toolName === "bash") {
		const command = String(args.event.input.command ?? "");
		const { isMutatingBash } = await import(
			"../lib/harness-context-mode-policy.js"
		);
		if (!isMutatingBash(command)) return undefined;
		if (state.aborted) {
			return {
				block: true,
				reason:
					"policy-gate: mutating bash command blocked because harness-abort lock is active. Attach a new approved plan first.",
			};
		}
		if (state.phase !== "execute" && state.phase !== "merge") {
			return {
				block: true,
				reason: `policy-gate: mutating bash command blocked in phase '${state.phase}'.`,
			};
		}
	}

	const { evaluateContextModeMutation } = await import(
		"../lib/harness-context-mode-policy.js"
	);
	const ctxDecision = evaluateContextModeMutation(
		args.event.toolName,
		args.event.input as Record<string, unknown>,
		state.phase,
		{ aborted: state.aborted, budgetBypass: state.budgetBypass },
	);
	if (ctxDecision.blocked) return { block: true, reason: ctxDecision.reason };
	return undefined;
}

async function handlePolicyToolResult(args: {
	pi: ExtensionAPI;
	stateRef: { current: PolicyState };
	event: any;
	ctx: any;
	appendPolicyState: (next: PolicyState) => void;
}): Promise<void> {
	const { pi, stateRef, event, ctx, appendPolicyState } = args;
	if (event.isError) return;
	if (event.toolName !== "write" && event.toolName !== "edit") return;

	const entries = ctx.sessionManager.getEntries();
	const state = getLatestPolicyStateFull(ctx);
	stateRef.current = state;
	const projectRoot = process.cwd();
	const runCtx = getLatestRunContext(entries);
	if (!runCtx) return;

	const target = extractWritePathFromToolInput(
		event.input as Record<string, unknown>,
	);
	if (!target) return;
	const scoped = await isPlanPhaseScopedWrite(target, runCtx, projectRoot);
	if (!scoped) return;

	const planPath = normalizeHarnessPath(target, projectRoot);
	const packet = await readPlanPacketFromPath(planPath);
	const validation = validatePlanPacket(packet);
	if (!validation.valid || !packet?.plan_id) return;
	if (!isHarnessAutoSession(entries)) return;

	state.phase = "execute";
	state.approvedPlan = true;
	state.planId = packet.plan_id;
	state.aborted = false;
	state.abortReason = null;
	state.abortedAt = null;
	state.updatedAt = nowIso();
	stateRef.current = state;
	appendPolicyState(state);

	runCtx.plan_ready = true;
	runCtx.plan_id = packet.plan_id;
	runCtx.phase = "execute";
	runCtx.updated_at = nowIso();
	pi.appendEntry("harness-run-context", runCtx);
	void saveRunContextToDisk(runCtx);
	void saveProjectActiveRun(runCtx);
}

export default function policyGate(pi: ExtensionAPI) {
	if (!isHarnessProjectEnabled()) return;
	const stateRef: { current: PolicyState } = { current: defaultState() };

	const appendPolicyState = (next: PolicyState): void => {
		stateRef.current = next;
		pi.appendEntry("harness-policy-state", stateRef.current);
	};

	pi.on("session_start", async (_event, ctx) => {
		await handlePolicySessionStart(pi, stateRef, ctx);
	});

	pi.on("before_agent_start", async (event, ctx) =>
		handlePolicyBeforeAgentStart({
			pi,
			stateRef,
			event,
			ctx,
		}),
	);

	pi.on("tool_call", async (event, ctx) =>
		handlePolicyToolCall({
			stateRef,
			event,
			ctx,
		}),
	);

	pi.on("tool_result", async (event, ctx) => {
		await handlePolicyToolResult({
			pi,
			stateRef,
			event,
			ctx,
			appendPolicyState,
		});
	});

	pi.registerCommand("harness-abort", {
		description: "Safely abort current harness run and reset to plan phase",
		handler: async (args, ctx) => {
			const reason = args.trim();
			stateRef.current.phase = "plan";
			stateRef.current.approvedPlan = false;
			stateRef.current.planId = null;
			stateRef.current.budgetBypass = false;
			stateRef.current.aborted = true;
			stateRef.current.abortReason =
				reason.length > 0 ? reason : "manual abort";
			stateRef.current.abortedAt = nowIso();
			stateRef.current.updatedAt = stateRef.current.abortedAt;
			pi.appendEntry("harness-policy-state", stateRef.current);
			pi.events.emit("harness-run-aborted", {
				reason: stateRef.current.abortReason,
				abortedAt: stateRef.current.abortedAt,
			});

			const runCtx = getLatestRunContext(ctx.sessionManager.getEntries());
			if (runCtx) {
				runCtx.status = "aborted";
				runCtx.plan_ready = false;
				runCtx.last_outcome = "aborted";
				runCtx.last_completed_step = "abort";
				runCtx.next_recommended_command = runCtx.task_summary
					? `/harness-plan "${runCtx.task_summary}"`
					: '/harness-plan "<task>"';
				runCtx.updated_at = stateRef.current.abortedAt ?? nowIso();
				pi.appendEntry("harness-run-context", runCtx);
				void saveRunContextToDisk(runCtx);
				void saveProjectActiveRun(runCtx);
			}

			const lines = [
				"Harness run aborted safely.",
				"  phase: plan",
				"  approvedPlan: false",
				`  abortReason: ${stateRef.current.abortReason}`,
				`  abortedAt: ${stateRef.current.abortedAt}`,
				"Mutating tools are now blocked until a new approved plan is attached.",
				'Next command: /harness-plan "<task>"',
			];
			if (ctx.hasUI) {
				ctx.ui.notify(lines.join("\n"), "warning");
				return;
			}
			pi.sendMessage({
				customType: "harness-policy-aborted",
				content: lines.join("\n"),
				display: true,
			});
		},
	});

	pi.registerCommand("harness-policy-status", {
		description: "Show current harness policy gate state",
		handler: async (_args, ctx) => {
			const latest = getLatestPolicyStateFull(ctx);
			const lines = [
				"Harness policy gate:",
				`  phase: ${latest.phase}`,
				`  approvedPlan: ${latest.approvedPlan}`,
				`  planId: ${latest.planId ?? "(none)"}`,
				`  aborted: ${latest.aborted}`,
				`  abortReason: ${latest.abortReason ?? "(none)"}`,
				`  abortedAt: ${latest.abortedAt ?? "(none)"}`,
				`  updatedAt: ${latest.updatedAt}`,
			];
			if (ctx.hasUI) {
				ctx.ui.notify(lines.join("\n"), "info");
				return;
			}
			pi.sendMessage({
				customType: "harness-policy-status",
				content: lines.join("\n"),
				display: true,
			});
		},
	});
}
