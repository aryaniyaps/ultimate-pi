/**
 * debate-orchestrator — headless debate bus (pi-messenger-inspired semantics).
 *
 * No additional UI surface:
 * - transport is extension custom entries + debate artifacts on disk
 * - command interface is machine-friendly (`/harness-debate-*`)
 *
 * Protocol envelope:
 * {
 *   protocol: "pi-debate-bus/v1",
 *   kind: "open" | "round" | "consensus" | "budget_exhausted",
 *   correlation: { run_id, debate_id, round_index?, sender },
 *   payload: { ... }
 * }
 */

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getRunIdFromSession } from "../lib/harness-run-context.js";

type DebateParticipant =
	| "EvaluatorAgent"
	| "AdversaryAgent"
	| "TieBreakerAgent";
type PolicyDecision = "pass" | "conditional_pass" | "block" | "human_required";

interface RoundPayload {
	participants: DebateParticipant[];
	claims: string[];
	rebuttals: string[];
	evidence_refs: string[];
	token_usage: {
		per_agent: Record<string, number>;
		round_total: number;
	};
	consensus_delta: number;
	severity_scores?: {
		correctness: number;
		security: number;
		architecture: number;
		test_integrity: number;
	};
}

interface DebateState {
	run_id: string;
	debate_id: string;
	round_count: number;
	budget_used: number;
	max_rounds: number;
	round_token_cap: number;
	debate_global_cap: number;
}

interface BusEnvelope<T = unknown> {
	protocol: "pi-debate-bus/v1";
	kind: "open" | "round" | "consensus" | "budget_exhausted";
	correlation: {
		run_id: string;
		debate_id: string;
		round_index?: number;
		sender: DebateParticipant | "system";
	};
	payload: T;
}

const DEBATES_DIR = join(process.cwd(), ".pi", "harness", "debates");
const WEIGHTS = {
	claim_quality: 0.2,
	reproducibility: 0.4,
	agreement: 0.4,
};
const THRESHOLDS = {
	correctness: 0.7,
	security: 0.7,
	architecture: 0.8,
	test_integrity: 0.8,
};
const HARD_STOP_DEBATE_CAPS = process.env.HARNESS_DEBATE_HARD_STOP === "true";

function nowIso(): string {
	return new Date().toISOString();
}

function toSafeFloat(value: unknown): number {
	const n = Number(value);
	if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
	return Math.max(0, Math.min(1, n));
}

async function ensureDebatesDir(): Promise<void> {
	await mkdir(DEBATES_DIR, { recursive: true });
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

async function readRoundCapsFromSchema(): Promise<{
	max_rounds: number;
	round_token_cap: number;
	debate_global_cap: number;
}> {
	try {
		const roundSchemaPath = join(
			process.cwd(),
			".pi",
			"harness",
			"specs",
			"round-result.schema.json",
		);
		const parsed = JSON.parse(await readFile(roundSchemaPath, "utf-8")) as {
			properties?: {
				budget_profile?: {
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
				parsed?.properties?.budget_profile?.properties?.max_rounds?.const ?? 6,
			),
			round_token_cap: Number(
				parsed?.properties?.budget_profile?.properties?.round_token_cap
					?.const ?? 2500,
			),
			debate_global_cap: Number(
				parsed?.properties?.budget_profile?.properties?.debate_global_cap
					?.const ?? 35000,
			),
		};
	} catch {
		return { max_rounds: 6, round_token_cap: 2500, debate_global_cap: 35000 };
	}
}

async function writeDebateEvent(
	debateId: string,
	event: unknown,
): Promise<void> {
	await ensureDebatesDir();
	const path = join(DEBATES_DIR, `${debateId}.jsonl`);
	await appendFile(path, `${JSON.stringify(event)}\n`, "utf-8");
}

function defaultSeverity(): {
	correctness: number;
	security: number;
	architecture: number;
	test_integrity: number;
} {
	return { correctness: 0, security: 0, architecture: 0, test_integrity: 0 };
}

function decidePolicy(
	severity: ReturnType<typeof defaultSeverity>,
	minEvidenceConfidence: number,
): PolicyDecision {
	if (
		severity.security >= THRESHOLDS.security ||
		severity.correctness >= THRESHOLDS.correctness ||
		severity.architecture >= THRESHOLDS.architecture ||
		severity.test_integrity >= THRESHOLDS.test_integrity
	) {
		return "block";
	}
	if (minEvidenceConfidence < 0.55) return "human_required";
	if (minEvidenceConfidence < 0.75) return "conditional_pass";
	return "pass";
}

function parseEnvelope(raw: string): BusEnvelope<RoundPayload> | null {
	try {
		const parsed = JSON.parse(raw) as BusEnvelope<RoundPayload>;
		if (parsed?.protocol !== "pi-debate-bus/v1") return null;
		if (parsed?.kind !== "round") return null;
		return parsed;
	} catch {
		return null;
	}
}

export default function debateOrchestrator(pi: ExtensionAPI) {
	let state: DebateState | null = null;
	let lastSeverity = defaultSeverity();

	async function openDebate(runId: string, debateId: string): Promise<void> {
		const caps = await readRoundCapsFromSchema();
		state = {
			run_id: runId,
			debate_id: debateId,
			round_count: 0,
			budget_used: 0,
			...caps,
		};
		pi.appendEntry("harness-debate-state", state);
		const envelope: BusEnvelope = {
			protocol: "pi-debate-bus/v1",
			kind: "open",
			correlation: {
				run_id: runId,
				debate_id: debateId,
				sender: "system",
			},
			payload: {
				opened_at: nowIso(),
				budget_profile: "aggressive",
			},
		};
		pi.appendEntry("harness-debate-envelope", envelope);
		await writeDebateEvent(debateId, envelope);
	}

	async function emitBudgetExhausted(reason: string): Promise<void> {
		if (!state) return;
		const envelope: BusEnvelope = {
			protocol: "pi-debate-bus/v1",
			kind: "budget_exhausted",
			correlation: {
				run_id: state.run_id,
				debate_id: state.debate_id,
				round_index: state.round_count,
				sender: "system",
			},
			payload: {
				schema_version: "1.0.0",
				contract_version: "1.0.0",
				event_type: "budget_exhausted",
				run_id: state.run_id,
				debate_id: state.debate_id,
				round_count: state.round_count,
				budget_used: state.budget_used,
				exhaustion_reason: reason,
				caps: {
					max_rounds: state.max_rounds,
					round_token_cap: state.round_token_cap,
					debate_global_cap: state.debate_global_cap,
				},
				minimum_evidence_confidence: 0.6,
				default_policy_outcome: "block",
				human_override_allowed: true,
			},
		};
		pi.appendEntry("harness-debate-envelope", envelope);
		pi.appendEntry("harness-budget-exhausted", envelope.payload);
		await writeDebateEvent(state.debate_id, envelope);
	}

	async function acceptRound(envelope: BusEnvelope<RoundPayload>): Promise<{
		ok: boolean;
		reason?: string;
	}> {
		if (!state) return { ok: false, reason: "no active debate" };
		if (state.debate_id !== envelope.correlation.debate_id) {
			return { ok: false, reason: "debate id mismatch" };
		}

		const nextRound = state.round_count + 1;
		if (nextRound > state.max_rounds) {
			await emitBudgetExhausted("max_rounds_reached");
			if (HARD_STOP_DEBATE_CAPS) {
				return { ok: false, reason: "max rounds reached" };
			}
		}

		const perAgent = envelope.payload.token_usage?.per_agent ?? {};
		for (const [agent, tokens] of Object.entries(perAgent)) {
			if (Number(tokens) > state.round_token_cap) {
				await emitBudgetExhausted("round_token_cap_exceeded");
				if (HARD_STOP_DEBATE_CAPS) {
					return { ok: false, reason: `round cap exceeded by ${agent}` };
				}
			}
		}

		const roundTotal = Number(envelope.payload.token_usage?.round_total ?? 0);
		if (state.budget_used + roundTotal > state.debate_global_cap) {
			await emitBudgetExhausted("debate_global_cap_exceeded");
			if (HARD_STOP_DEBATE_CAPS) {
				return { ok: false, reason: "global cap exceeded" };
			}
		}

		state.round_count = nextRound;
		state.budget_used += roundTotal;
		pi.appendEntry("harness-debate-state", state);

		if (envelope.payload.severity_scores) {
			lastSeverity = {
				correctness: toSafeFloat(envelope.payload.severity_scores.correctness),
				security: toSafeFloat(envelope.payload.severity_scores.security),
				architecture: toSafeFloat(
					envelope.payload.severity_scores.architecture,
				),
				test_integrity: toSafeFloat(
					envelope.payload.severity_scores.test_integrity,
				),
			};
		}

		const roundRecord = {
			schema_version: "1.0.0",
			contract_version: "1.0.0",
			run_id: state.run_id,
			debate_id: state.debate_id,
			round_index: state.round_count,
			participants: envelope.payload.participants,
			claims: envelope.payload.claims,
			rebuttals: envelope.payload.rebuttals,
			evidence_refs: envelope.payload.evidence_refs,
			token_usage: envelope.payload.token_usage,
			budget_profile: {
				name: "aggressive",
				max_rounds: state.max_rounds,
				round_token_cap: state.round_token_cap,
				debate_global_cap: state.debate_global_cap,
			},
			consensus_delta: Number(envelope.payload.consensus_delta ?? 0),
		};
		pi.appendEntry("harness-round-result", roundRecord);
		pi.appendEntry("harness-debate-envelope", envelope);
		await writeDebateEvent(state.debate_id, envelope);
		return { ok: true };
	}

	async function finalizeConsensus(
		rationale: string,
	): Promise<PolicyDecision | null> {
		if (!state) return null;
		const evidenceScore = Math.max(
			0,
			Math.min(
				1,
				lastSeverity.correctness * WEIGHTS.claim_quality +
					(1 - Math.max(lastSeverity.security, lastSeverity.test_integrity)) *
						WEIGHTS.reproducibility +
					Math.max(
						0,
						1 - Math.abs(lastSeverity.architecture - lastSeverity.correctness),
					) *
						WEIGHTS.agreement,
			),
		);
		const decision = decidePolicy(lastSeverity, evidenceScore);

		const consensus = {
			schema_version: "1.0.0",
			contract_version: "1.0.0",
			run_id: state.run_id,
			debate_id: state.debate_id,
			round_count: state.round_count,
			budget_used: state.budget_used,
			severity_scores: lastSeverity,
			severity_thresholds: {
				correctness_block_at: THRESHOLDS.correctness,
				security_block_at: THRESHOLDS.security,
				architecture_block_at: THRESHOLDS.architecture,
				test_integrity_block_at: THRESHOLDS.test_integrity,
			},
			confidence_weights: WEIGHTS,
			evidence_refs: [],
			strict_gate_prerequisites: {
				plan_gate_passed: true,
				execution_completed: true,
				evaluator_passed: true,
				adversarial_debate_completed: state.round_count > 0,
				severity_policy_ok: decision !== "block",
				benchmark_delta_checks_passed: false,
				rollback_artifacts_generated: false,
			},
			policy_decision: decision,
			rationale,
		};

		const envelope: BusEnvelope = {
			protocol: "pi-debate-bus/v1",
			kind: "consensus",
			correlation: {
				run_id: state.run_id,
				debate_id: state.debate_id,
				round_index: state.round_count,
				sender: "system",
			},
			payload: consensus,
		};

		await writeFile(
			join(DEBATES_DIR, `${state.debate_id}.consensus.json`),
			`${JSON.stringify(consensus, null, 2)}\n`,
			"utf-8",
		);
		pi.appendEntry("harness-consensus-packet", consensus);
		pi.appendEntry("harness-debate-envelope", envelope);
		await writeDebateEvent(state.debate_id, envelope);
		return decision;
	}

	pi.on("session_start", async (_event, ctx) => {
		const entries = ctx.sessionManager.getEntries();
		for (let i = entries.length - 1; i >= 0; i--) {
			const entry = entries[i];
			if (
				entry.type === "custom" &&
				entry.customType === "harness-debate-state"
			) {
				state = entry.data as DebateState;
				break;
			}
		}
	});

	pi.registerCommand("harness-debate-open", {
		description: "Open a headless debate session",
		handler: async (args, ctx) => {
			const trimmed = args.trim();
			let debateId = trimmed;
			if (!debateId) debateId = `debate-${Date.now()}`;
			await openDebate(getRunId(ctx), debateId);
			pi.sendMessage({
				customType: "harness-debate-opened",
				content: `Debate opened: ${debateId}`,
				display: false,
			});
		},
	});

	pi.registerCommand("harness-debate-round", {
		description: "Submit a debate round envelope JSON",
		handler: async (args, ctx) => {
			if (!state) {
				await openDebate(getRunId(ctx), `debate-${Date.now()}`);
			}
			const envelope = parseEnvelope(args.trim());
			if (!envelope) {
				pi.sendMessage({
					customType: "harness-debate-round-error",
					content:
						"Invalid debate envelope JSON. Expect protocol=pi-debate-bus/v1, kind=round.",
					display: true,
				});
				return;
			}
			const result = await acceptRound(envelope);
			if (!result.ok) {
				pi.sendMessage({
					customType: "harness-debate-round-rejected",
					content: `Round rejected: ${result.reason ?? "unknown reason"}`,
					display: true,
				});
			}
		},
	});

	pi.registerCommand("harness-debate-consensus", {
		description: "Finalize debate and emit consensus packet",
		handler: async (args) => {
			if (!state) {
				pi.sendMessage({
					customType: "harness-debate-consensus-error",
					content: "No active debate to finalize.",
					display: true,
				});
				return;
			}
			const decision = await finalizeConsensus(
				args.trim() || "Consensus generated by debate-orchestrator.",
			);
			pi.sendMessage({
				customType: "harness-debate-consensus",
				content: `Consensus decision: ${decision ?? "unknown"}`,
				display: true,
			});
		},
	});
}
