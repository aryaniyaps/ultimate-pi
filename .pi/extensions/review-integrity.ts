/**
 * review-integrity — enforce evaluator/adversary isolation from executor session.
 *
 * Parent orchestrators spawn review agents in isolated subprocesses via `subagent`.
 * Direct review tools in the executor session are blocked.
 */

import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isHarnessProjectEnabled } from "../lib/harness-project-config.js";

type HarnessPhase = "plan" | "execute" | "evaluate" | "adversary" | "merge";

const INCIDENTS_DIR = join(process.cwd(), ".pi", "harness", "incidents");
const INCIDENT_FILE = join(INCIDENTS_DIR, "review-integrity.jsonl");

const REVIEW_SUBAGENT_TYPES = new Set([
	"harness/reviewing/evaluator",
	"harness/reviewing/adversary",
	"harness/reviewing/tie-breaker",
]);

const EXECUTOR_SUBAGENT_TYPE = "harness/running/executor";
const PLANNING_SUBAGENT_PREFIX = "harness/planning/";

interface IsolationState {
	executorSessionId: string | null;
	violationActive: boolean;
	updatedAt: string;
}

interface SessionEntryLike {
	type?: string;
	customType?: string;
	data?: {
		phase?: HarnessPhase;
		executorSessionId?: string;
		violationActive?: boolean;
		updatedAt?: string;
	};
}

function nowIso(): string {
	return new Date().toISOString();
}

function getPhase(ctx: {
	sessionManager: { getEntries(): unknown[] };
}): HarnessPhase {
	const entries = ctx.sessionManager.getEntries() as SessionEntryLike[];
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (
			entry.type === "custom" &&
			entry.customType === "harness-policy-state"
		) {
			const phase = entry.data?.phase;
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
	}
	return "plan";
}

function restoreState(ctx: {
	sessionManager: { getEntries(): unknown[] };
}): IsolationState {
	const entries = ctx.sessionManager.getEntries() as SessionEntryLike[];
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (
			entry.type !== "custom" ||
			entry.customType !== "harness-review-integrity"
		)
			continue;
		const data = entry.data as Partial<IsolationState> | undefined;
		return {
			executorSessionId:
				typeof data?.executorSessionId === "string"
					? data.executorSessionId
					: null,
			violationActive: Boolean(data?.violationActive),
			updatedAt:
				typeof data?.updatedAt === "string" ? data.updatedAt : nowIso(),
		};
	}
	return {
		executorSessionId: null,
		violationActive: false,
		updatedAt: nowIso(),
	};
}

function agentsFromSubagentInput(
	input: Record<string, unknown> | undefined,
): string[] {
	if (!input) return [];
	const names: string[] = [];
	if (typeof input.agent === "string") names.push(input.agent);
	const tasks = input.tasks;
	if (Array.isArray(tasks)) {
		for (const t of tasks) {
			if (
				t &&
				typeof t === "object" &&
				typeof (t as { agent?: string }).agent === "string"
			) {
				names.push((t as { agent: string }).agent);
			}
		}
	}
	const chain = input.chain;
	if (Array.isArray(chain)) {
		for (const c of chain) {
			if (
				c &&
				typeof c === "object" &&
				typeof (c as { agent?: string }).agent === "string"
			) {
				names.push((c as { agent: string }).agent);
			}
		}
	}
	const agg = input.aggregator;
	if (
		agg &&
		typeof agg === "object" &&
		typeof (agg as { agent?: string }).agent === "string"
	) {
		names.push((agg as { agent: string }).agent);
	}
	return names;
}

function latestCustomData(
	entries: SessionEntryLike[],
	customType: string,
): Record<string, unknown> | null {
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type !== "custom" || entry.customType !== customType) continue;
		return entry.data && typeof entry.data === "object" ? entry.data : null;
	}
	return null;
}

function collectStrings(value: unknown, depth = 0): string[] {
	if (depth > 5 || value == null) return [];
	if (typeof value === "string") return [value];
	if (Array.isArray(value)) {
		return value.flatMap((item) => collectStrings(item, depth + 1));
	}
	if (typeof value === "object") {
		return Object.values(value).flatMap((item) =>
			collectStrings(item, depth + 1),
		);
	}
	return [];
}

export function hasPlanReviseRecommendation(entries: unknown[]): boolean {
	const typedEntries = entries as SessionEntryLike[];
	const runContext = latestCustomData(typedEntries, "harness-run-context");
	const text = collectStrings({
		next_recommended_command: runContext?.next_recommended_command,
		last_completed_step: runContext?.last_completed_step,
		last_outcome: runContext?.last_outcome,
		phase: runContext?.phase,
	})
		.join("\n")
		.toLowerCase();

	return text.includes("/harness-plan") && text.includes("revise");
}

export function isPlanRevisePlanningSubagent(input: {
	agents: string[];
	entries: unknown[];
	toolInput?: Record<string, unknown>;
}): boolean {
	if (input.agents.length === 0) return false;
	if (
		!input.agents.every((agent) => agent.startsWith(PLANNING_SUBAGENT_PREFIX))
	) {
		return false;
	}
	if (hasPlanReviseRecommendation(input.entries)) return true;

	const toolText = collectStrings(input.toolInput).join("\n").toLowerCase();
	return (
		toolText.includes("harness-plan") &&
		(toolText.includes("mode: revise") ||
			toolText.includes("mode=revise") ||
			toolText.includes("--mode revise") ||
			toolText.includes("--mode=revise"))
	);
}

async function appendIncident(payload: Record<string, unknown>): Promise<void> {
	await mkdir(INCIDENTS_DIR, { recursive: true });
	await appendFile(
		INCIDENT_FILE,
		`${JSON.stringify({ timestamp: nowIso(), ...payload })}\n`,
		"utf-8",
	);
}

export default function reviewIntegrity(pi: ExtensionAPI) {
	if (!isHarnessProjectEnabled()) return;
	let state: IsolationState = {
		executorSessionId: null,
		violationActive: false,
		updatedAt: nowIso(),
	};

	const persist = (): void => {
		pi.appendEntry("harness-review-integrity", state);
	};

	pi.on("session_start", async (_event, ctx) => {
		state = restoreState(ctx);
	});

	pi.on("agent_end", async (_event, ctx) => {
		const phase = getPhase(ctx);
		if (phase !== "execute") return;
		state.executorSessionId = ctx.sessionManager.getSessionId();
		state.violationActive = false;
		state.updatedAt = nowIso();
		persist();
	});

	pi.on("before_agent_start", async (_event, ctx) => {
		const phase = getPhase(ctx);
		const currentSessionId = ctx.sessionManager.getSessionId();
		const inReview = phase === "evaluate" || phase === "adversary";
		if (
			!inReview ||
			hasPlanReviseRecommendation(ctx.sessionManager.getEntries())
		) {
			state.violationActive = false;
			state.updatedAt = nowIso();
			persist();
			return undefined;
		}

		if (
			!state.executorSessionId ||
			state.executorSessionId !== currentSessionId
		) {
			state.violationActive = false;
			state.updatedAt = nowIso();
			persist();
			return undefined;
		}

		state.violationActive = true;
		state.updatedAt = nowIso();
		persist();

		return {
			message: {
				customType: "harness-review-integrity-hint",
				display: true,
				content: [
					"Review phase in executor session: spawn harness/reviewing/evaluator or harness/reviewing/adversary via subagent (isolated subprocess).",
					"Do not run review checks directly in this session.",
				].join("\n"),
			},
		};
	});

	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName === "subagent") {
			const toolInput = event.input as Record<string, unknown> | undefined;
			const agents = agentsFromSubagentInput(toolInput);
			if (agents.includes(EXECUTOR_SUBAGENT_TYPE)) {
				state.executorSessionId = ctx.sessionManager.getSessionId();
				state.violationActive = false;
				state.updatedAt = nowIso();
				persist();
				return undefined;
			}
			if (agents.some((a) => REVIEW_SUBAGENT_TYPES.has(a))) {
				state.violationActive = false;
				state.updatedAt = nowIso();
				persist();
				return undefined;
			}
			if (
				isPlanRevisePlanningSubagent({
					agents,
					entries: ctx.sessionManager.getEntries(),
					toolInput,
				})
			) {
				state.violationActive = false;
				state.updatedAt = nowIso();
				persist();
				return undefined;
			}
		}

		if (!state.violationActive) return undefined;

		await appendIncident({
			type: "review_integrity_violation",
			session_id: ctx.sessionManager.getSessionId(),
			tool: event.toolName,
			reason:
				"direct tool use in review phase while sharing executor session context",
			mitigation:
				"spawn harness/reviewing/evaluator or harness/reviewing/adversary via subagent instead",
		});

		return {
			block: true,
			reason:
				"review-integrity: tool blocked in review phase — spawn an isolated review subagent via subagent.",
		};
	});

	pi.registerCommand("harness-review-integrity-status", {
		description: "Show current review-integrity isolation state",
		handler: async (_args, ctx) => {
			const latest = restoreState(ctx);
			const lines = [
				"Review integrity status:",
				`  executorSessionId: ${latest.executorSessionId ?? "(none)"}`,
				`  violationActive: ${latest.violationActive}`,
				`  updatedAt: ${latest.updatedAt}`,
			];
			if (ctx.hasUI) {
				ctx.ui.notify(lines.join("\n"), "info");
				return;
			}
			pi.sendMessage({
				customType: "harness-review-integrity-status",
				content: lines.join("\n"),
				display: true,
			});
		},
	});
}
