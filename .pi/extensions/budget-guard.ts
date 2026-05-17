/**
 * budget-guard — hard-stop budget enforcement by run + phase.
 *
 * Emits `budget_exhausted` artifacts aligned to
 * `.pi/harness/specs/budget-exhausted-event.schema.json`.
 */

import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getRunIdFromSession } from "../lib/harness-run-context.js";

type HarnessPhase = "plan" | "execute" | "evaluate" | "adversary" | "merge";

interface BudgetExhaustedEvent {
	schema_version: "1.0.0";
	contract_version: "1.0.0";
	event_type: "budget_exhausted";
	run_id: string;
	debate_id: string;
	round_count: number;
	budget_used: number;
	exhaustion_reason:
		| "max_rounds_reached"
		| "round_token_cap_exceeded"
		| "debate_global_cap_exceeded";
	caps: {
		max_rounds: number;
		round_token_cap: number;
		debate_global_cap: number;
	};
	minimum_evidence_confidence: number;
	default_policy_outcome: "block" | "human_required";
	human_override_allowed: true;
}

interface SessionEntryLike {
	type?: string;
	customType?: string;
	data?: { phase?: HarnessPhase; budgetBypass?: boolean };
	message?: {
		role?: string;
		usage?: { input?: number; output?: number };
	};
}

const RUNS_DIR = join(process.cwd(), ".pi", "harness", "runs");
const EVENTS_FILE = join(RUNS_DIR, "budget-events.jsonl");

const DEFAULT_GLOBAL_CAP = Number(
	process.env.HARNESS_BUDGET_TOTAL_TOKENS ?? "120000",
);
const HARD_STOP_BUDGETS = process.env.HARNESS_BUDGET_HARD_STOP === "true";
const DEFAULT_PHASE_CAPS: Record<HarnessPhase, number> = {
	plan: Number(process.env.HARNESS_BUDGET_PLAN_TOKENS ?? "12000"),
	execute: Number(process.env.HARNESS_BUDGET_EXECUTE_TOKENS ?? "80000"),
	evaluate: Number(process.env.HARNESS_BUDGET_EVALUATE_TOKENS ?? "25000"),
	adversary: Number(process.env.HARNESS_BUDGET_ADVERSARY_TOKENS ?? "35000"),
	merge: Number(process.env.HARNESS_BUDGET_MERGE_TOKENS ?? "8000"),
};

function nowIso(): string {
	return new Date().toISOString();
}

async function ensureRunsDir(): Promise<void> {
	await mkdir(RUNS_DIR, { recursive: true });
}

function readUsageTotals(ctx: {
	sessionManager: { getEntries(): unknown[] };
}): {
	totalTokens: number;
	byPhase: Partial<Record<HarnessPhase, number>>;
} {
	const entries = ctx.sessionManager.getEntries() as SessionEntryLike[];
	const totals: Partial<Record<HarnessPhase, number>> = {};
	let total = 0;
	let currentPhase: HarnessPhase | null = null;

	for (const entry of entries) {
		if (
			entry.type === "custom" &&
			entry.customType === "harness-policy-state"
		) {
			const phase = entry.data?.phase as HarnessPhase | undefined;
			if (phase) currentPhase = phase;
			continue;
		}

		if (entry.type !== "message" || entry.message?.role !== "assistant")
			continue;
		const usage = entry.message.usage ?? {};
		const tokens = Number(usage.input ?? 0) + Number(usage.output ?? 0);
		total += tokens;
		if (currentPhase) {
			totals[currentPhase] = Number(totals[currentPhase] ?? 0) + tokens;
		}
	}

	return { totalTokens: total, byPhase: totals };
}

function getPolicyContext(ctx: {
	sessionManager: { getEntries(): unknown[] };
}): {
	phase: HarnessPhase | null;
	budgetBypass: boolean;
} {
	const entries = ctx.sessionManager.getEntries() as SessionEntryLike[];
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (
			entry.type === "custom" &&
			entry.customType === "harness-policy-state"
		) {
			const phase = entry.data?.phase;
			const budgetBypass = Boolean(entry.data?.budgetBypass);
			if (
				phase === "plan" ||
				phase === "execute" ||
				phase === "evaluate" ||
				phase === "adversary" ||
				phase === "merge"
			) {
				return { phase, budgetBypass };
			}
		}
	}
	return { phase: null, budgetBypass: false };
}

function getRunId(ctx: {
	sessionManager: { getEntries(): unknown[]; getSessionId(): string };
}): string {
	return (
		getRunIdFromSession(
			ctx.sessionManager.getEntries(),
			ctx.sessionManager.getSessionId(),
		) ?? ctx.sessionManager.getSessionId()
	);
}

async function readDebateCapsFromSchema(): Promise<{
	max_rounds: number;
	round_token_cap: number;
	debate_global_cap: number;
}> {
	try {
		const schemaPath = join(
			process.cwd(),
			".pi",
			"harness",
			"specs",
			"budget-exhausted-event.schema.json",
		);
		const parsed = JSON.parse(await readFile(schemaPath, "utf-8")) as {
			properties?: {
				caps?: {
					properties?: {
						max_rounds?: { const?: number };
						round_token_cap?: { const?: number };
						debate_global_cap?: { const?: number };
					};
				};
			};
		};
		return {
			max_rounds: Number(
				parsed?.properties?.caps?.properties?.max_rounds?.const ?? 6,
			),
			round_token_cap: Number(
				parsed?.properties?.caps?.properties?.round_token_cap?.const ?? 2500,
			),
			debate_global_cap: Number(
				parsed?.properties?.caps?.properties?.debate_global_cap?.const ?? 35000,
			),
		};
	} catch {
		return { max_rounds: 6, round_token_cap: 2500, debate_global_cap: 35000 };
	}
}

async function emitBudgetEvent(
	pi: ExtensionAPI,
	event: BudgetExhaustedEvent,
): Promise<void> {
	await ensureRunsDir();
	const line = `${JSON.stringify({ timestamp: nowIso(), ...event })}\n`;
	await appendFile(EVENTS_FILE, line, "utf-8");
	pi.appendEntry("harness-budget-exhausted", event);
}

export default function budgetGuard(pi: ExtensionAPI) {
	pi.on("tool_call", async (_event, ctx) => {
		const policy = getPolicyContext(ctx);
		if (policy.phase === null || policy.budgetBypass) return undefined;

		const phase = policy.phase;
		const usage = readUsageTotals(ctx);
		const phaseUsed = Number(usage.byPhase[phase] ?? 0);
		const globalCap = DEFAULT_GLOBAL_CAP;
		const phaseCap = DEFAULT_PHASE_CAPS[phase];
		const caps = await readDebateCapsFromSchema();

		if (usage.totalTokens < globalCap && phaseUsed < phaseCap) return undefined;

		const exhausted: BudgetExhaustedEvent = {
			schema_version: "1.0.0",
			contract_version: "1.0.0",
			event_type: "budget_exhausted",
			run_id: getRunId(ctx),
			debate_id: `${phase}-budget-guard`,
			round_count: 1,
			budget_used: Math.max(usage.totalTokens, phaseUsed),
			exhaustion_reason: "debate_global_cap_exceeded",
			caps,
			minimum_evidence_confidence: 0.6,
			default_policy_outcome: "block",
			human_override_allowed: true,
		};

		await emitBudgetEvent(pi, exhausted);
		if (!HARD_STOP_BUDGETS) {
			pi.appendEntry("harness-budget-soft-limit", {
				run_id: exhausted.run_id,
				phase,
				phaseUsed,
				phaseCap,
				totalUsed: usage.totalTokens,
				totalCap: globalCap,
				timestamp: nowIso(),
			});
			return undefined;
		}
		return {
			block: true,
			reason: `budget-guard: hard stop in phase '${phase}' (phase=${phaseUsed}/${phaseCap}, total=${usage.totalTokens}/${globalCap}).`,
		};
	});

	pi.registerCommand("harness-budget-status", {
		description: "Show harness token budget usage by phase",
		handler: async (_args, ctx) => {
			const usage = readUsageTotals(ctx);
			const lines = [
				"Harness budget status:",
				`  total: ${usage.totalTokens}/${DEFAULT_GLOBAL_CAP}`,
				...(
					[
						"plan",
						"execute",
						"evaluate",
						"adversary",
						"merge",
					] as HarnessPhase[]
				).map(
					(phase) =>
						`  ${phase}: ${Number(usage.byPhase[phase] ?? 0)}/${DEFAULT_PHASE_CAPS[phase]}`,
				),
			];
			if (ctx.hasUI) {
				ctx.ui.notify(lines.join("\n"), "info");
				return;
			}
			pi.sendMessage({
				customType: "harness-budget-status",
				content: lines.join("\n"),
				display: true,
			});
		},
	});
}
