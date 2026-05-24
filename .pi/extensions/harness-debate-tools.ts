/**
 * P0–P3 plan debate tools — bus + pi-messenger transport.
 */

import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { claimHarnessGovernanceLoad } from "../lib/extension-load-guard.js";
import {
	captureHarnessEvent,
	DEBATE_AGENT_SUBMIT_TOOL,
	type DebateParticipant,
	extractLastSubmitCall,
	getLatestRunContext,
	getRunIdFromSession,
	type MessageLike,
	parseYaml,
	Type,
	writeYamlFile,
} from "../lib/harness-debate-core-deps.js";
import {
	acceptDebateRound,
	applyDebateLane,
	applyDebateLaneFromDoc,
	assessPlanScopeDrift,
	buildPlanReviewRoundEnvelope,
	capsForDebate,
	type DebateEligibilityInput,
	type DebateLaneKind,
	debateLaneForAgent,
	finalizeDebateConsensus,
	formatApplyLaneMessage,
	formatTranscriptForSpawn,
	getDebateState,
	getMessengerRoundState,
	getPlanDebateRoundStatus,
	getPlanFocusCoverage,
	harnessPlanDebateEligibility,
	initPlanMessenger,
	loadMessengerState,
	loadValidationTurnYaml,
	messengerRoundDebateReady,
	normalizePlanDebateId,
	openDebateBus,
	type PlanReviewRoundDraft,
	planDebateIdForRun,
	planDebateOutcomeComplete,
	postMessengerMessage,
	readRoundTranscript,
	validateIntegratorDraft,
	withReviewRoundYamlWrite,
} from "../lib/harness-debate-workflow-deps.js";

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
): Array<{ agent: string; finalOutput?: string; messages?: MessageLike[] }> {
	const d = details as {
		results?: Array<{
			agent: string;
			finalOutput?: string;
			messages?: MessageLike[];
		}>;
	};
	return d?.results ?? [];
}

const USE_SUBMIT_TOOLS = process.env.HARNESS_SUBMIT_TOOLS !== "0";

export default function harnessDebateTools(pi: ExtensionAPI) {
	if (!claimHarnessGovernanceLoad("harness-debate-tools", MODULE_URL)) return;

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
			if (!lane) continue;

			const submitTool = DEBATE_AGENT_SUBMIT_TOOL[result.agent ?? ""];
			const submitCall =
				USE_SUBMIT_TOOLS && submitTool && result.messages
					? extractLastSubmitCall(result.messages, submitTool)
					: null;

			if (submitCall) {
				const out = await applyDebateLaneFromDoc({
					runDir: rd,
					lane,
					doc: submitCall.document,
				});
				if (out.round_index) lastRound = out.round_index;
				pi.appendEntry("harness-debate-lane-applied", {
					agent: result.agent,
					source: "submit_tool",
					tool: submitCall.toolName,
					...out,
				});
				applied.push(formatApplyLaneMessage(out));
				continue;
			}

			if (!result.finalOutput?.trim()) continue;
			if (USE_SUBMIT_TOOLS && submitTool) continue;

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

		const status = await getPlanDebateRoundStatus(rd, lastRound, runId);
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
		name: "harness_plan_debate_eligibility",
		label: "Plan Debate Eligibility",
		description:
			"Pre-debate profile selection (full|standard|light|fast). Call after DAG pass, before harness_debate_open. Uses risk, fork, implementation/stack briefs — not R1 hypothesis output.",
		parameters: Type.Object({
			risk_level: Type.Optional(
				Type.String({ description: "low | med | high" }),
			),
			material_fork: Type.Optional(Type.Boolean()),
			dag_pass: Type.Optional(Type.Boolean()),
			dag_manually_patched: Type.Optional(Type.Boolean()),
			implementation_brief_path: Type.Optional(
				Type.String({
					description:
						"Default: artifacts/implementation-research.yaml under run dir",
				}),
			),
			stack_brief_path: Type.Optional(Type.String()),
			decomposition_path: Type.Optional(Type.String()),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const runId = getRunId(ctx);
			const rd = runDir(process.cwd(), runId);
			const p = params as {
				risk_level?: string;
				material_fork?: boolean;
				dag_pass?: boolean;
				dag_manually_patched?: boolean;
				implementation_brief_path?: string;
				stack_brief_path?: string;
				decomposition_path?: string;
			};
			async function loadYaml(
				rel: string,
			): Promise<Record<string, unknown> | null> {
				try {
					const raw = await readFile(join(rd, rel), "utf-8");
					return parseYaml(raw) as Record<string, unknown>;
				} catch {
					return null;
				}
			}
			const input: DebateEligibilityInput = {
				risk_level: p.risk_level,
				material_fork: p.material_fork,
				dag_pass: p.dag_pass,
				dag_manually_patched: p.dag_manually_patched,
				implementation_brief: await loadYaml(
					p.implementation_brief_path ??
						"artifacts/implementation-research.yaml",
				),
				stack_brief: await loadYaml(
					p.stack_brief_path ?? "artifacts/stack.yaml",
				),
				decomposition: await loadYaml(
					p.decomposition_path ?? "artifacts/decomposition.yaml",
				),
			};
			const result = harnessPlanDebateEligibility(input);
			const lines = [
				`profile: ${result.profile}`,
				`review_gate_mode: ${result.review_gate_strategy.mode}`,
				`required_focuses: ${result.required_focuses.join(", ")}`,
				`min_focus_rounds: ${result.min_focus_rounds}`,
				`debate_global_cap: ${result.debate_global_cap}`,
				`human_required: ${result.human_required}`,
				...result.rationale.map((r) => `- ${r}`),
			];
			return {
				content: [{ type: "text", text: lines.join("\n") }],
				details: result,
			};
		},
	});

	pi.registerTool({
		name: "harness_debate_open",
		label: "Open Plan Debate",
		description:
			"Open plan-phase debate bus (plan-<run_id>) and initialize pi-messenger inboxes/threads. Call once after harness_plan_debate_eligibility.",
		parameters: Type.Object({
			debate_id: Type.Optional(
				Type.String({ description: "Optional; normalized to plan-<run_id>" }),
			),
			debate_profile: Type.Optional(
				Type.String({ description: "full | standard | light | fast" }),
			),
			required_focuses: Type.Optional(
				Type.Array(
					Type.String({ description: "spec | wbs | schedule | quality" }),
				),
			),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const runId = getRunId(ctx);
			const projectRoot = process.cwd();
			const p = params as {
				debate_id?: string;
				debate_profile?: string;
				required_focuses?: string[];
			};
			const raw = String(p.debate_id ?? "");
			const { debateId, corrected, warning } = normalizePlanDebateId(
				raw,
				runId,
			);
			const profile =
				p.debate_profile === "full" ||
				p.debate_profile === "standard" ||
				p.debate_profile === "light" ||
				p.debate_profile === "fast"
					? p.debate_profile
					: "standard";
			const required_focuses = (p.required_focuses ?? []).filter((f) =>
				["spec", "wbs", "schedule", "quality"].includes(f),
			) as Array<"spec" | "wbs" | "schedule" | "quality">;
			const opened = await openDebateBus(runId, debateId, debateHooks(pi), {
				debate_profile: profile,
				required_focuses:
					required_focuses.length > 0 ? required_focuses : undefined,
			});
			const review_gate_mode =
				profile === "fast" ? ("consolidated" as const) : ("threaded" as const);
			await initPlanMessenger(runDir(projectRoot, runId), {
				runId,
				debateId,
				debate_profile: profile,
				required_focuses: opened.required_focuses,
				review_gate_mode,
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
				`Profile: ${profile}`,
				`Review gate mode: ${review_gate_mode}`,
				required_focuses.length
					? `Required focuses: ${required_focuses.join(", ")}`
					: opened.required_focuses?.length
						? `Required focuses: ${opened.required_focuses.join(", ")}`
						: "Required focuses: (default all four)",
				review_gate_mode === "consolidated"
					? "Consolidated path: one review round (artifacts/review-round-consolidated.yaml); escalate to threaded rounds only on blockers."
					: "Threaded path: one review round per focus (spec → wbs → schedule → quality).",
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
			round_index: Type.Number({ description: "1–12 (monotonic per run)" }),
			from: Type.String({
				description:
					"PlanEvaluatorAgent | PlanAdversaryAgent | ReviewIntegratorAgent | HypothesisValidatorAgent | SprintContractAuditorAgent",
			}),
			kind: Type.String({
				description:
					"claim | rebuttal | clarification | counter | integrate | audit | system",
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
				kind:
					| "claim"
					| "rebuttal"
					| "clarification"
					| "counter"
					| "integrate"
					| "audit"
					| "system";
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
			round_index: Type.Number({ description: "1–12 (monotonic per run)" }),
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

			const caps = capsForDebate(debateId);
			const roundState = await getMessengerRoundState(rd, roundIndex);
			const mCheck = messengerRoundDebateReady(roundState, roundIndex >= 4, {
				max_exchanges_per_round: caps.max_exchanges_per_round,
			});
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
			"After all focus areas covered (spec|wbs|schedule|quality) and last review_gate_ready true, emit consensus packet to .pi/harness/debates/plan-<run_id>.consensus.json",
		parameters: Type.Object({
			rationale: Type.Optional(Type.String()),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const runId = getRunId(ctx);
			const rationale =
				String((params as { rationale?: string }).rationale ?? "").trim() ||
				"Plan Review Gate consensus after focus coverage and messenger-backed rounds.";
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
			round_index: Type.Number({ description: "1–12 (monotonic per run)" }),
			debate_round_focus: Type.Optional(
				Type.String({ description: "spec | wbs | schedule | quality" }),
			),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const runId = getRunId(ctx);
			const p = params as {
				round_index: number;
				debate_round_focus?: string;
			};
			const roundIndex = Number(p.round_index);
			const focus =
				p.debate_round_focus === "spec" ||
				p.debate_round_focus === "wbs" ||
				p.debate_round_focus === "schedule" ||
				p.debate_round_focus === "quality"
					? p.debate_round_focus
					: undefined;
			const status = await getPlanDebateRoundStatus(
				runDir(process.cwd(), runId),
				roundIndex,
				runId,
				focus ? { debate_round_focus: focus } : undefined,
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
		name: "harness_debate_focus_coverage",
		label: "Plan Debate Focus Coverage",
		description:
			"Return which Review Gate focuses (spec|wbs|schedule|quality) are covered by submitted review-round artifacts and whether debate outcome is complete.",
		parameters: Type.Object({}),
		async execute(_id, _params, _signal, _onUpdate, ctx) {
			const runId = getRunId(ctx);
			const rd = runDir(process.cwd(), runId);
			const messenger = await loadMessengerState(rd);
			const requiredFocuses = messenger?.required_focuses;
			const coverage = await getPlanFocusCoverage(rd, { requiredFocuses });
			const caps = capsForDebate(
				planDebateIdForRun(runId),
				messenger?.debate_profile,
			);
			const complete = planDebateOutcomeComplete(coverage, {
				requiredFocuses,
				minRoundIndex: caps.min_focus_rounds,
			});
			const lines = [
				`Profile: ${messenger?.debate_profile ?? "standard"}`,
				`Required: ${(requiredFocuses ?? ["spec", "wbs", "schedule", "quality"]).join(", ")}`,
				`Covered: ${coverage.covered.join(", ") || "(none)"}`,
				coverage.missing.length
					? `Missing: ${coverage.missing.join(", ")}`
					: "All required focuses covered.",
				`Last round: ${coverage.last_round_index}, review_gate_ready=${coverage.last_review_gate_ready}`,
				`Outcome complete: ${complete}`,
				`Budget: min_focus_rounds=${caps.min_focus_rounds}, max_rounds=${caps.max_rounds}, max_exchanges_per_round=${caps.max_exchanges_per_round}`,
			];
			return {
				content: [{ type: "text", text: lines.join("\n") }],
				details: {
					coverage,
					caps,
					complete,
					profile: messenger?.debate_profile,
				},
			};
		},
	});

	pi.registerTool({
		name: "harness_debate_advance_thread",
		label: "Advance Plan Debate Thread",
		description:
			"Ping-pong helper: read round transcript and return next spawn (evaluator clarification vs adversary counter) based on unresolved claim_ids and exchange_count.",
		parameters: Type.Object({
			round_index: Type.Number(),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const runId = getRunId(ctx);
			const roundIndex = Number(
				(params as { round_index: number }).round_index,
			);
			const status = await getPlanDebateRoundStatus(
				runDir(process.cwd(), runId),
				roundIndex,
				runId,
			);
			const text = [
				`Round ${roundIndex}: exchange_count=${status.exchange_count}`,
				status.unresolved_claim_ids.length
					? `Unresolved claims: ${status.unresolved_claim_ids.join(", ")}`
					: "No unresolved claims.",
				status.next_tool
					? `Next: ${status.next_tool}`
					: "Dialogue complete — spawn review-integrator.",
			].join("\n");
			return {
				content: [{ type: "text", text }],
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
