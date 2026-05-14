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
		}
		state.phase = nextPhase;
		state.updatedAt = nowIso();
		pi.appendEntry("harness-policy-state", state);

		return {
			systemPrompt: `${event.systemPrompt}\n\n[PolicyGate]\nPhase=${state.phase}; ApprovedPlan=${state.approvedPlan}; PlanId=${state.planId ?? "none"}.`,
		};
	});

	pi.on("tool_call", async (event) => {
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

	pi.registerCommand("harness-policy-status", {
		description: "Show current harness policy gate state",
		handler: async (_args, ctx) => {
			const latest = getLatestPolicyState(ctx);
			const lines = [
				"Harness policy gate:",
				`  phase: ${latest.phase}`,
				`  approvedPlan: ${latest.approvedPlan}`,
				`  planId: ${latest.planId ?? "(none)"}`,
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
