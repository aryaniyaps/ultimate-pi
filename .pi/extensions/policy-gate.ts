/**
 * policy-gate — plan-before-mutate and phase enforcement.
 *
 * Pi-compatible patterns:
 * - default extension factory
 * - state persisted via pi.appendEntry()
 * - enforcement via before_agent_start + tool_call hooks
 * - command surface via pi.registerCommand()
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type HarnessPhase = "plan" | "execute" | "evaluate" | "adversary" | "merge";

interface PolicyState {
	phase: HarnessPhase;
	approvedPlan: boolean;
	planId: string | null;
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

const MUTATING_TOOLS = new Set(["write", "edit"]);
const BASH_MUTATION_PATTERNS = [
	/\bgit\s+commit\b/i,
	/\bgit\s+push\b/i,
	/\bgit\s+merge\b/i,
	/\bgit\s+rebase\b/i,
	/\brm\s+(-rf?|--recursive)\b/i,
	/\bmv\b/i,
	/\bcp\b/i,
	/\bmkdir\b/i,
	/\bchmod\b/i,
	/\bchown\b/i,
	/\bsed\s+-i\b/i,
	/\bperl\s+-i\b/i,
];

function nowIso(): string {
	return new Date().toISOString();
}

function defaultState(): PolicyState {
	return {
		phase: "plan",
		approvedPlan: false,
		planId: null,
		aborted: false,
		abortReason: null,
		abortedAt: null,
		updatedAt: nowIso(),
	};
}

function inferPhase(prompt: string, current: HarnessPhase): HarnessPhase {
	const p = prompt.toLowerCase();
	if (p.includes("/harness-plan") || p.includes("harness-plan")) return "plan";
	if (p.includes("/harness-run") || p.includes("harness-run")) return "execute";
	if (p.includes("/harness-eval") || p.includes("harness-eval"))
		return "evaluate";
	if (p.includes("/harness-review") || p.includes("harness-review"))
		return "evaluate";
	if (p.includes("/harness-critic") || p.includes("harness-critic"))
		return "adversary";
	if (p.includes("adversary")) return "adversary";
	if (p.includes("merge gate") || p.includes("policy decision")) return "merge";
	return current;
}

function hasApprovedPlanSignal(prompt: string): boolean {
	const p = prompt.toLowerCase();
	return (
		p.includes("planpacket") ||
		p.includes("--plan") ||
		p.includes("approved plan") ||
		p.includes("plan_id")
	);
}

function hasAbortSignal(prompt: string): boolean {
	const p = prompt.toLowerCase();
	return p.includes("/harness-abort") || p.includes("harness-abort");
}

function isValidTransition(from: HarnessPhase, to: HarnessPhase): boolean {
	if (from === to) return true;
	const fromIndex = PHASE_ORDER.indexOf(from);
	const toIndex = PHASE_ORDER.indexOf(to);
	return toIndex === fromIndex + 1;
}

function isMutatingBash(command: string): boolean {
	return BASH_MUTATION_PATTERNS.some((pattern) => pattern.test(command));
}

function getLatestPolicyState(ctx: {
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

export default function policyGate(pi: ExtensionAPI) {
	let state = defaultState();

	pi.on("session_start", async (_event, ctx) => {
		state = getLatestPolicyState(ctx);
	});

	pi.on("before_agent_start", async (event) => {
		const abortSignal = hasAbortSignal(event.prompt);
		if (abortSignal) {
			state.phase = "plan";
			state.approvedPlan = false;
			state.planId = null;
			state.aborted = true;
			state.abortReason = "harness-abort command";
			state.abortedAt = nowIso();
			state.updatedAt = state.abortedAt;
			pi.appendEntry("harness-policy-state", state);
			return {
				message: {
					customType: "harness-policy-aborted",
					display: true,
					content: [
						"Harness run aborted safely.",
						"Mutating tools are now blocked until a new approved plan is attached.",
						'Next step: /harness-plan "<task>"',
					].join("\n"),
				},
				systemPrompt: `${event.systemPrompt}\n\n[PolicyGate]\nAbort lock active. Mutating tools must remain blocked until a new approved plan is attached.`,
			};
		}

		const nextPhase = inferPhase(event.prompt, state.phase);
		const planSignal = hasApprovedPlanSignal(event.prompt);

		if (!isValidTransition(state.phase, nextPhase)) {
			return {
				message: {
					customType: "harness-policy-violation",
					display: true,
					content: [
						`Policy gate blocked invalid phase transition: ${state.phase} -> ${nextPhase}.`,
						"Run /harness-plan first or continue in the current phase.",
					].join("\n"),
				},
			};
		}

		if (nextPhase === "plan") {
			state.approvedPlan = false;
			state.planId = null;
		}

		if (nextPhase === "execute" && !state.approvedPlan && !planSignal) {
			return {
				message: {
					customType: "harness-policy-plan-required",
					display: true,
					content:
						"Policy gate: execution requires an approved PlanPacket (`/harness-plan` then `/harness-run --plan ...`).",
				},
				systemPrompt: `${event.systemPrompt}\n\n[PolicyGate]\nDo not use mutating tools until an approved PlanPacket is attached.`,
			};
		}

		if (planSignal) {
			state.approvedPlan = true;
			const planMatch = event.prompt.match(
				/plan[_-]?id["'\s:=]+([A-Za-z0-9._:-]+)/i,
			);
			state.planId = planMatch?.[1] ?? state.planId;
			state.aborted = false;
			state.abortReason = null;
			state.abortedAt = null;
		}
		state.phase = nextPhase;
		state.updatedAt = nowIso();
		pi.appendEntry("harness-policy-state", state);

		return {
			systemPrompt: `${event.systemPrompt}\n\n[PolicyGate]\nPhase=${state.phase}; ApprovedPlan=${state.approvedPlan}; PlanId=${state.planId ?? "none"}; Aborted=${state.aborted}.`,
		};
	});

	pi.on("tool_call", async (event) => {
		if (state.aborted && MUTATING_TOOLS.has(event.toolName)) {
			return {
				block: true,
				reason:
					"policy-gate: mutating tool blocked because harness-abort lock is active. Attach a new approved plan first.",
			};
		}
		if (MUTATING_TOOLS.has(event.toolName)) {
			if (state.phase !== "execute") {
				return {
					block: true,
					reason: `policy-gate: ${event.toolName} blocked in phase '${state.phase}'. Allowed only in execute phase.`,
				};
			}
			if (!state.approvedPlan) {
				return {
					block: true,
					reason:
						"policy-gate: mutating tool blocked because no approved PlanPacket is active.",
				};
			}
		}

		if (event.toolName === "bash") {
			const command = String(event.input.command ?? "");
			if (!isMutatingBash(command)) return undefined;
			if (state.aborted) {
				return {
					block: true,
					reason:
						"policy-gate: mutating bash command blocked because harness-abort lock is active. Attach a new approved plan first.",
				};
			}
			if (state.phase !== "execute") {
				return {
					block: true,
					reason: `policy-gate: mutating bash command blocked in phase '${state.phase}'.`,
				};
			}
			if (!state.approvedPlan) {
				return {
					block: true,
					reason:
						"policy-gate: mutating bash command blocked because plan approval signal is missing.",
				};
			}
		}

		return undefined;
	});

	pi.registerCommand("harness-abort", {
		description: "Safely abort current harness run and reset to plan phase",
		handler: async (args, ctx) => {
			const reason = args.trim();
			state.phase = "plan";
			state.approvedPlan = false;
			state.planId = null;
			state.aborted = true;
			state.abortReason = reason.length > 0 ? reason : "manual abort";
			state.abortedAt = nowIso();
			state.updatedAt = state.abortedAt;
			pi.appendEntry("harness-policy-state", state);

			const lines = [
				"Harness run aborted safely.",
				"  phase: plan",
				"  approvedPlan: false",
				`  abortReason: ${state.abortReason}`,
				`  abortedAt: ${state.abortedAt}`,
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
			const latest = getLatestPolicyState(ctx);
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
