/**
 * Plan orchestration tools — FSM next action + synthesis route.
 */

import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { claimHarnessGovernanceLoad } from "../lib/extension-load-guard.js";
import {
	captureHarnessEvent,
	getRunIdFromSession,
	Type,
} from "../lib/harness-debate-core-deps.js";
import { derivePlanNextAction } from "../lib/harness-plan-fsm.js";
import {
	derivePlanRouteSpawns,
	planSynthesisPath,
} from "../lib/harness-plan-route.js";

// @ts-expect-error pi extensions run as ESM
const MODULE_URL = import.meta.url;

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

function runDir(projectRoot: string, runId: string): string {
	return join(projectRoot, ".pi", "harness", "runs", runId);
}

export default function harnessPlanOrchestration(pi: ExtensionAPI) {
	if (!claimHarnessGovernanceLoad("harness-plan-orchestration", MODULE_URL))
		return;

	pi.registerTool({
		name: "harness_plan_next_action",
		label: "Plan Next Action",
		description:
			"Deterministic plan-phase FSM: returns the next spawn, tool, gate, or wait_user action. Call before improvising orchestration steps.",
		parameters: Type.Object({
			quick: Type.Optional(Type.Boolean()),
			task_summary: Type.Optional(Type.String()),
			last_outcome: Type.Optional(Type.String()),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const runId = getRunId(ctx);
			const projectRoot = process.cwd();
			const p = params as {
				quick?: boolean;
				task_summary?: string;
				last_outcome?: string | null;
			};
			const entries = ctx.sessionManager.getEntries();
			const next = await derivePlanNextAction({
				projectRoot,
				runId,
				entries,
				quick: p.quick,
				taskSummary: p.task_summary,
				lastOutcome: p.last_outcome,
			});
			const sessionId = ctx.sessionManager.getSessionId();
			captureHarnessEvent(sessionId, "harness_plan_fsm", {
				run_id: runId,
				phase: next.phase,
				action: next.action,
				review_gate_mode: next.review_gate_mode,
				synthesis_route: next.synthesis_route,
			});
			const lines = [
				`phase: ${next.phase}`,
				`action: ${next.action}`,
				next.tool ? `tool: ${next.tool}` : null,
				next.agents?.length ? `agents: ${next.agents.join(", ")}` : null,
				next.review_gate_mode
					? `review_gate_mode: ${next.review_gate_mode}`
					: null,
				next.synthesis_route
					? `synthesis_route: ${next.synthesis_route}`
					: null,
				...next.rationale.map((r) => `- ${r}`),
			].filter(Boolean);
			return {
				content: [{ type: "text", text: lines.join("\n") }],
				details: next,
			};
		},
	});

	pi.registerTool({
		name: "harness_plan_route",
		label: "Plan Synthesis Route",
		description:
			"Returns sequential vs plan-synthesizer routing and next planning spawns from disk artifacts.",
		parameters: Type.Object({
			risk_level: Type.Optional(Type.String()),
			material_fork: Type.Optional(Type.Boolean()),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const runId = getRunId(ctx);
			const rd = runDir(process.cwd(), runId);
			const p = params as { risk_level?: string; material_fork?: boolean };
			const route = await planSynthesisPath(rd, {
				risk_level: p.risk_level,
				material_fork: p.material_fork,
			});
			const spawns = await derivePlanRouteSpawns(rd, {
				risk_level: p.risk_level,
				material_fork: p.material_fork,
			});
			const sessionId = ctx.sessionManager.getSessionId();
			captureHarnessEvent(sessionId, "harness_plan_route", {
				run_id: runId,
				route,
				agents: spawns.agents,
			});
			return {
				content: [
					{
						type: "text",
						text: [
							`route: ${route}`,
							spawns.agents.length
								? `next_agents: ${spawns.agents.join(", ")}`
								: "next_agents: (none — advance to debate or approval)",
							...spawns.rationale.map((r) => `- ${r}`),
						].join("\n"),
					},
				],
				details: spawns,
			};
		},
	});
}
