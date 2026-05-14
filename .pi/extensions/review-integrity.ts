/**
 * review-integrity — enforce evaluator/adversary isolation from executor session.
 *
 * If review phases (`evaluate`/`adversary`) run in the same session as execution,
 * tool calls are blocked until the review is isolated (fork/switch session).
 */

import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type HarnessPhase = "plan" | "execute" | "evaluate" | "adversary" | "merge";

const INCIDENTS_DIR = join(process.cwd(), ".pi", "harness", "incidents");
const INCIDENT_FILE = join(INCIDENTS_DIR, "review-integrity.jsonl");

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

	pi.on("session_start", async (_event, ctx) => {
		state = restoreState(ctx);
	});

	pi.on("agent_end", async (_event, ctx) => {
		const phase = getPhase(ctx);
		if (phase !== "execute") return;
		state.executorSessionId = ctx.sessionManager.getSessionId();
		state.violationActive = false;
		state.updatedAt = nowIso();
		pi.appendEntry("harness-review-integrity", state);
	});

	pi.on("before_agent_start", async (_event, ctx) => {
		const phase = getPhase(ctx);
		const currentSessionId = ctx.sessionManager.getSessionId();
		const inReview = phase === "evaluate" || phase === "adversary";
		if (!inReview) {
			state.violationActive = false;
			state.updatedAt = nowIso();
			pi.appendEntry("harness-review-integrity", state);
			return undefined;
		}

		if (
			!state.executorSessionId ||
			state.executorSessionId !== currentSessionId
		) {
			state.violationActive = false;
			state.updatedAt = nowIso();
			pi.appendEntry("harness-review-integrity", state);
			return undefined;
		}

		state.violationActive = true;
		state.updatedAt = nowIso();
		pi.appendEntry("harness-review-integrity", state);

		await appendIncident({
			type: "review_integrity_violation",
			session_id: currentSessionId,
			phase,
			reason:
				"evaluator/adversary session is not isolated from executor session",
			mitigation:
				"fork or switch to a clean review session before running review tools",
		});

		return {
			message: {
				customType: "harness-review-integrity-block",
				display: true,
				content: [
					"Review integrity violation: evaluator/adversary is sharing executor session context.",
					"Fork/switch session, then rerun review to maintain independent evaluation guarantees.",
				].join("\n"),
			},
		};
	});

	pi.on("tool_call", async (_event) => {
		if (!state.violationActive) return undefined;
		return {
			block: true,
			reason:
				"review-integrity: tool call blocked because review session is not isolated from executor context.",
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
