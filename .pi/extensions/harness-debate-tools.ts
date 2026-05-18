/**
 * P0–P3 plan debate tools — bus + pi-messenger transport.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import type { DebateParticipant } from "../lib/debate-orchestrator-types.js";
import {
	getLatestRunContext,
	getRunIdFromSession,
} from "../lib/harness-run-context.js";
import { writeYamlFile } from "../lib/harness-yaml.js";
import {
	acceptDebateRound,
	finalizeDebateConsensus,
	openDebateBus,
} from "./lib/debate-bus-core.js";
import { getDebateState } from "./lib/debate-bus-state.js";
import { claimExtensionLoad } from "./lib/extension-load-guard.js";
import { captureHarnessEvent } from "./lib/harness-posthog.js";
import {
	buildPlanReviewRoundEnvelope,
	type PlanReviewRoundDraft,
} from "./lib/plan-debate-envelope.js";
import {
	normalizePlanDebateId,
	planDebateIdForRun,
} from "./lib/plan-debate-id.js";
import {
	applyDebateLane,
	type DebateLaneKind,
	debateLaneForAgent,
	formatApplyLaneMessage,
} from "./lib/plan-debate-lane.js";
import { getPlanDebateRoundStatus } from "./lib/plan-debate-round-status.js";
import { withReviewRoundYamlWrite } from "./lib/plan-debate-write-guard.js";
import {
	formatTranscriptForSpawn,
	getMessengerRoundState,
	initPlanMessenger,
	messengerRoundDebateReady,
	postMessengerMessage,
	readRoundTranscript,
} from "./lib/plan-messenger.js";
import {
	loadValidationTurnYaml,
	validateIntegratorDraft,
} from "./lib/plan-review-integrator-rules.js";
import { assessPlanScopeDrift } from "./lib/plan-scope-guard.js";

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

function debateHooks(pi: ExtensionAPI) {
	return {
		appendEntry: (customType: string, data: unknown) =>
			pi.appendEntry(customType, data),
	};
}

function telemetryRound(
	sessionId: string,
	props: Record<string, unknown>,
): void {
	captureHarnessEvent(sessionId, "harness_debate_round", props);
}

function subagentResults(
	details: unknown,
): Array<{ agent: string; finalOutput?: string }> {
	const d = details as {
		results?: Array<{ agent: string; finalOutput?: string }>;
	};
	return d?.results ?? [];
}

export default function harnessDebateTools(pi: ExtensionAPI) {
	if (!claimExtensionLoad("harness-debate-tools", MODULE_URL)) return;

	pi.on("tool_result", async (event, ctx) => {
		if (event.isError || event.toolName !== "subagent") return;
		const runId = getRunId(ctx);
		const projectRoot = process.cwd();
		const rd = runDir(projectRoot, runId);
		const entries = ctx.sessionManager.getEntries();
		const runCtx = getLatestRunContext(entries);
		if (!runCtx?.run_id || runCtx.run_id !== runId) return;

		const applied: string[] = [];
		let lastRound = 1;
		for (const result of subagentResults(event.details)) {
			const lane = debateLaneForAgent(result.agent ?? "");
			if (!lane || !result.finalOutput?.trim()) continue;
			const out = await applyDebateLane({
				runDir: rd,
				lane,
				content: result.finalOutput,
			});
			if (out.round_index) lastRound = out.round_index;
			pi.appendEntry("harness-debate-lane-applied", {
				agent: result.agent,
				...out,
			});
			applied.push(formatApplyLaneMessage(out));
		}
		if (applied.length === 0) return;

		const status = await getPlanDebateRoundStatus(rd, lastRound);
		pi.sendMessage({
			customType: "harness-debate-next-step",
			content: [
				"**Debate lane auto-applied from subagent output**",
				...applied,
				"",
				status.next_tool
					? `**Required next tool (do not stop with prose only):** ${status.next_tool}`
					: "Check harness_debate_round_status for this round.",
			].join("\n"),
			display: true,
			details: { applied, status },
		});
	});

	pi.registerTool({
		name: "harness_debate_open",
		label: "Open Plan Debate",
		description:
			"Open plan-phase debate bus (plan-<run_id>) and initialize pi-messenger inboxes/threads. Call once before Review Gate rounds.",
		parameters: Type.Object({
			debate_id: Type.Optional(
				Type.String({ description: "Optional; normalized to plan-<run_id>" }),
			),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const runId = getRunId(ctx);
			const projectRoot = process.cwd();
			const raw = String((params as { debate_id?: string }).debate_id ?? "");
			const { debateId, corrected, warning } = normalizePlanDebateId(
				raw,
				runId,
			);
			const opened = await openDebateBus(runId, debateId, debateHooks(pi));
			await initPlanMessenger(runDir(projectRoot, runId), {
				runId,
				debateId,
			});
			const sessionId = ctx.sessionManager.getSessionId();
			captureHarnessEvent(sessionId, "harness_debate_round", {
				run_id: runId,
				debate_id: debateId,
				event: "open",
				debate_phase: "plan",
				corrected_id: corrected,
			});
			const lines = [
				`Plan debate opened: ${debateId}`,
				`Messenger: debate-messenger/ (inbox + threads/round-N/transcript.jsonl)`,
			];
			if (warning) lines.push(`Note: ${warning}`);
			return {
				content: [{ type: "text", text: lines.join("\n") }],
				details: { run_id: runId, debate_id: debateId, state: opened },
			};
		},
	});

	pi.registerTool({
		name: "harness_messenger_post",
		label: "Post Debate Messenger Message",
		description:
			"Post a claim/rebuttal/integrate message to the round thread and agent inbox (pi-messenger style). Evaluator posts claims first; adversary rebuts with in_reply_to claim ids.",
		parameters: Type.Object({
			round_index: Type.Number({ description: "1–4" }),
			from: Type.String({
				description:
					"PlanEvaluatorAgent | PlanAdversaryAgent | ReviewIntegratorAgent | HypothesisValidatorAgent | SprintContractAuditorAgent",
			}),
			kind: Type.String({
				description: "claim | rebuttal | integrate | audit | system",
			}),
			body: Type.String(),
			to: Type.Optional(Type.Array(Type.String())),
			in_reply_to: Type.Optional(Type.Array(Type.String())),
			claim_ids: Type.Optional(Type.Array(Type.String())),
			evidence_refs: Type.Optional(Type.Array(Type.String())),
			artifact_path: Type.Optional(Type.String()),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const runId = getRunId(ctx);
			const p = params as {
				round_index: number;
				from: DebateParticipant;
				kind: "claim" | "rebuttal" | "integrate" | "audit" | "system";
				body: string;
				to?: Array<DebateParticipant | "broadcast">;
				in_reply_to?: string[];
				claim_ids?: string[];
				evidence_refs?: string[];
				artifact_path?: string;
			};
			const msg = await postMessengerMessage(runDir(process.cwd(), runId), {
				from: p.from,
				kind: p.kind,
				round_index: p.round_index,
				to: p.to ?? ["broadcast"],
				body: p.body,
				in_reply_to: p.in_reply_to ?? [],
				claim_ids: p.claim_ids ?? [],
				evidence_refs: p.evidence_refs ?? [],
				artifact_path: p.artifact_path,
			});
			return {
				content: [
					{
						type: "text",
						text: `Posted ${msg.kind} from ${msg.from} (round ${msg.round_index}, id ${msg.id})`,
					},
				],
				details: { message: msg },
			};
		},
	});

	pi.registerTool({
		name: "harness_messenger_read_round",
		label: "Read Debate Round Transcript",
		description:
			"Return formatted messenger transcript for spawning adversary or integrator with full thread context.",
		parameters: Type.Object({
			round_index: Type.Number(),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const runId = getRunId(ctx);
			const roundIndex = Number(
				(params as { round_index: number }).round_index,
			);
			const messages = await readRoundTranscript(
				runDir(process.cwd(), runId),
				roundIndex,
			);
			const text = formatTranscriptForSpawn(messages);
			return {
				content: [{ type: "text", text }],
				details: { round_index: roundIndex, message_count: messages.length },
			};
		},
	});

	pi.registerTool({
		name: "harness_debate_submit_round",
		label: "Submit Plan Review Round",
		description:
			"Validate lane YAML + messenger thread, write review-round-rN.yaml, emit bus round envelope. Parent must not write review-round files directly.",
		parameters: Type.Object({
			round_index: Type.Number({ description: "1–4" }),
			integrator_draft: Type.Record(Type.String(), Type.Unknown(), {
				description: "ReviewIntegrator YAML object (review-round-rN fields)",
			}),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const runId = getRunId(ctx);
			const projectRoot = process.cwd();
			const roundIndex = Number(
				(params as { round_index: number }).round_index,
			);
			const draft = (params as { integrator_draft: Record<string, unknown> })
				.integrator_draft as unknown as PlanReviewRoundDraft;
			draft.round_index = roundIndex;
			if (!draft.schema_version) draft.schema_version = "1.0.0";
			const debateId = planDebateIdForRun(runId);
			const rd = runDir(projectRoot, runId);
			const integratorBody =
				(typeof draft.round_summary === "string" && draft.round_summary) ||
				"Review integrator synthesis for this round.";
			await postMessengerMessage(rd, {
				from: "ReviewIntegratorAgent",
				kind: "integrate",
				round_index: roundIndex,
				to: ["broadcast"],
				body: integratorBody,
				in_reply_to: [],
				claim_ids: [],
				evidence_refs: [`artifacts/review-round-r${roundIndex}.yaml`],
			});

			const roundState = await getMessengerRoundState(rd, roundIndex);
			const mCheck = messengerRoundDebateReady(roundState, roundIndex === 4);
			if (!mCheck.ok) {
				return {
					content: [
						{
							type: "text",
							text: `Messenger gate failed:\n- ${mCheck.errors.join("\n- ")}`,
						},
					],
					details: { errors: mCheck.errors },
					isError: true,
				};
			}

			const validationTurn = await loadValidationTurnYaml(rd, roundIndex);
			const integratorValidation = validateIntegratorDraft(
				draft as unknown as Record<string, unknown>,
				{ validationTurn },
			);
			if (!integratorValidation.ok) {
				return {
					content: [
						{
							type: "text",
							text: `Integrator rules failed:\n- ${integratorValidation.errors.join("\n- ")}`,
						},
					],
					details: { errors: integratorValidation.errors },
					isError: true,
				};
			}
			draft.review_gate_ready = integratorValidation.review_gate_ready;

			const relPath = `artifacts/review-round-r${roundIndex}.yaml`;
			const absPath = join(rd, relPath);
			await withReviewRoundYamlWrite(async () => {
				await mkdir(dirname(absPath), { recursive: true });
				await writeYamlFile(absPath, draft);
			});

			const envelope = buildPlanReviewRoundEnvelope(draft, {
				runId,
				debateId,
			});
			const busState = getDebateState();
			if (!busState || busState.debate_id !== debateId) {
				await openDebateBus(runId, debateId, debateHooks(pi));
			}
			const result = await acceptDebateRound(envelope, debateHooks(pi));
			if (!result.ok) {
				return {
					content: [
						{
							type: "text",
							text: `Bus round rejected: ${result.reason ?? "unknown"}`,
						},
					],
					details: { envelope },
					isError: true,
				};
			}

			const sessionId = ctx.sessionManager.getSessionId();
			telemetryRound(sessionId, {
				run_id: runId,
				debate_id: debateId,
				round_index: roundIndex,
				review_gate_ready: draft.review_gate_ready,
				messenger_messages: roundState?.claim_count,
			});

			return {
				content: [
					{
						type: "text",
						text: `Round ${roundIndex} submitted to ${debateId} (review_gate_ready=${draft.review_gate_ready})`,
					},
				],
				details: {
					path: relPath,
					envelope,
					review_gate_ready: draft.review_gate_ready,
					warnings: integratorValidation.warnings,
				},
			};
		},
	});

	pi.registerTool({
		name: "harness_debate_consensus",
		label: "Finalize Plan Debate Consensus",
		description:
			"After 4 bus rounds, emit consensus packet to .pi/harness/debates/plan-<run_id>.consensus.json",
		parameters: Type.Object({
			rationale: Type.Optional(Type.String()),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const runId = getRunId(ctx);
			const rationale =
				String((params as { rationale?: string }).rationale ?? "").trim() ||
				"Plan Review Gate consensus after 4 messenger-backed rounds.";
			const decision = await finalizeDebateConsensus(
				rationale,
				debateHooks(pi),
			);
			const debateId = planDebateIdForRun(runId);
			captureHarnessEvent(
				ctx.sessionManager.getSessionId(),
				"harness_debate_consensus",
				{
					run_id: runId,
					debate_id: debateId,
					policy_decision: decision,
				},
			);
			return {
				content: [
					{
						type: "text",
						text: `Consensus: ${decision ?? "unknown"} (${debateId})`,
					},
				],
				details: { policy_decision: decision, debate_id: debateId },
			};
		},
	});

	pi.registerTool({
		name: "harness_debate_apply_lane",
		label: "Apply Debate Lane YAML + Messenger",
		description:
			"Parse subagent lane output, write artifacts/*-rN.yaml, and post evaluator claims / adversary rebuttals to messenger. Prefer letting subagent tool_result auto-apply; use this if auto-apply missed fenced YAML.",
		parameters: Type.Object({
			lane: Type.String({
				description:
					"hypothesis-validation | validation-turn | adversary-brief | sprint-audit",
			}),
			content: Type.String({ description: "Fenced YAML/JSON from subagent" }),
			round_index: Type.Optional(Type.Number()),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const runId = getRunId(ctx);
			const p = params as {
				lane: DebateLaneKind;
				content: string;
				round_index?: number;
			};
			const result = await applyDebateLane({
				runDir: runDir(process.cwd(), runId),
				lane: p.lane,
				content: p.content,
				roundIndex: p.round_index,
			});
			return {
				content: [{ type: "text", text: formatApplyLaneMessage(result) }],
				details: result,
				isError: !result.ok,
			};
		},
	});

	pi.registerTool({
		name: "harness_debate_round_status",
		label: "Plan Debate Round Status",
		description:
			"List missing lane artifacts and messenger steps for a Review Gate round. Call when resuming after a stop.",
		parameters: Type.Object({
			round_index: Type.Number({ description: "1–4" }),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const runId = getRunId(ctx);
			const roundIndex = Number(
				(params as { round_index: number }).round_index,
			);
			const status = await getPlanDebateRoundStatus(
				runDir(process.cwd(), runId),
				roundIndex,
			);
			const lines = [
				`Round ${roundIndex}: ready_for_integrator=${status.ready_for_integrator}`,
				status.missing.length
					? `Missing:\n- ${status.missing.join("\n- ")}`
					: "Lane + messenger prerequisites satisfied.",
				status.next_tool ? `Next: ${status.next_tool}` : "",
			].filter(Boolean);
			return {
				content: [{ type: "text", text: lines.join("\n\n") }],
				details: status,
			};
		},
	});

	pi.registerTool({
		name: "harness_plan_scope_check",
		label: "Plan Scope Drift Check",
		description:
			"P2 guard: compare task_summary with decomposition text; returns material_drift when plan narrows to infra-only work.",
		parameters: Type.Object({
			task_summary: Type.String(),
			decomposition_text: Type.String(),
		}),
		async execute(_id, params) {
			const p = params as { task_summary: string; decomposition_text: string };
			const result = assessPlanScopeDrift(p.task_summary, p.decomposition_text);
			return {
				content: [
					{
						type: "text",
						text: `${result.summary}\nmaterial_drift=${result.material_drift} overlap=${result.overlap_score.toFixed(3)}`,
					},
				],
				details: result,
			};
		},
	});
}
