/**
 * review-integrity — enforce evaluator/adversary isolation from executor session.
 *
 * Parent orchestrators spawn review agents in isolated subagent sessions.
 * Direct review tools in the executor session are blocked; Agent/get_subagent_result
 * for harness review agents remain allowed.
 */

import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type HarnessPhase = "plan" | "execute" | "evaluate" | "adversary" | "merge";

const INCIDENTS_DIR = join(process.cwd(), ".pi", "harness", "incidents");
const INCIDENT_FILE = join(INCIDENTS_DIR, "review-integrity.jsonl");

const ORCHESTRATION_TOOLS = new Set([
	"Agent",
	"get_subagent_result",
	"steer_subagent",
]);

const REVIEW_SUBAGENT_TYPES = new Set([
	"harness/evaluator",
	"harness/adversary",
	"harness/tie-breaker",
]);

const EXECUTOR_SUBAGENT_TYPE = "harness/executor";

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

function subagentTypeFromInput(
	input: Record<string, unknown> | undefined,
): string {
	if (!input) return "";
	const direct = input.subagent_type;
	if (typeof direct === "string") return direct;
	const nested = input as { subagentType?: string };
	if (typeof nested.subagentType === "string") return nested.subagentType;
	return "";
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
		if (!inReview) {
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
					"Review phase in executor session: spawn harness/evaluator or harness/adversary via Agent (isolated subagent context).",
					"Do not run review checks directly in this session — use get_subagent_result after spawn.",
				].join("\n"),
			},
		};
	});

	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName === "Agent") {
			const subagentType = subagentTypeFromInput(
				event.input as Record<string, unknown> | undefined,
			);
			if (subagentType === EXECUTOR_SUBAGENT_TYPE) {
				state.executorSessionId = ctx.sessionManager.getSessionId();
				state.violationActive = false;
				state.updatedAt = nowIso();
				persist();
				return undefined;
			}
			if (REVIEW_SUBAGENT_TYPES.has(subagentType)) {
				state.violationActive = false;
				state.updatedAt = nowIso();
				persist();
				return undefined;
			}
		}

		if (!state.violationActive) return undefined;

		if (ORCHESTRATION_TOOLS.has(event.toolName)) {
			return undefined;
		}

		await appendIncident({
			type: "review_integrity_violation",
			session_id: ctx.sessionManager.getSessionId(),
			tool: event.toolName,
			reason:
				"direct tool use in review phase while sharing executor session context",
			mitigation:
				"spawn harness/evaluator or harness/adversary via Agent instead",
		});

		return {
			block: true,
			reason:
				"review-integrity: tool blocked in review phase — spawn an isolated review subagent via Agent.",
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
