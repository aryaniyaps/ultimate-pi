/**
 * Headless pi-debate-bus/v1 transport (shared by commands + harness debate tools).
 */

import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	type DebateState,
	getDebateState,
	getLastSeverity,
	type SeverityScores,
	setDebateState,
	setLastSeverity,
} from "./debate-bus-state.js";
import {
	type DebateParticipant,
	debatePhaseFromId,
	isPlanDebateId,
	PLAN_DEBATE_PARTICIPANTS,
	POST_EXECUTE_DEBATE_PARTICIPANTS,
} from "./debate-orchestrator-types.js";
import {
	isHarnessBudgetEnforceOn,
	shouldEmitBlockingBudgetExhausted,
} from "./harness-budget-enforce.js";
import {
	type DebateProfile,
	PLAN_BUDGET_FAST,
	PLAN_BUDGET_LIGHT,
	PLAN_BUDGET_STANDARD,
} from "./plan-debate-eligibility.js";
import {
	getPlanFocusCoverage,
	PLAN_FOCUS_AREAS,
	type PlanDebateFocus,
	planDebateOutcomeComplete,
} from "./plan-debate-focus.js";

export type PolicyDecision =
	| "pass"
	| "conditional_pass"
	| "block"
	| "human_required";

export interface RoundPayload {
	participants: DebateParticipant[];
	claims: string[];
	rebuttals: string[];
	evidence_refs: string[];
	token_usage: {
		per_agent: Record<string, number>;
		round_total: number;
	};
	consensus_delta: number;
	severity_scores?: SeverityScores;
	review_gate_ready?: boolean;
}

export interface BusEnvelope<T = unknown> {
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
const HARD_STOP_DEBATE_CAPS =
	process.env.HARNESS_DEBATE_HARD_STOP === "true" && isHarnessBudgetEnforceOn();

const PLAN_BUDGET = PLAN_BUDGET_STANDARD;

const AGGRESSIVE_BUDGET = {
	max_rounds: 6,
	round_token_cap: 2500,
	debate_global_cap: 35000,
} as const;

function nowIso(): string {
	return new Date().toISOString();
}

function toSafeFloat(value: unknown): number {
	const n = Number(value);
	if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
	return Math.max(0, Math.min(1, n));
}

export function capsForDebate(
	debateId: string,
	profile?: DebateProfile,
): {
	name: "plan" | "aggressive";
	min_focus_rounds: number;
	max_rounds: number;
	max_exchanges_per_round: number;
	round_token_cap: number;
	debate_global_cap: number;
} {
	if (isPlanDebateId(debateId)) {
		const active = profile ?? getDebateState()?.debate_profile ?? "standard";
		const budget =
			active === "light"
				? PLAN_BUDGET_LIGHT
				: active === "fast"
					? PLAN_BUDGET_FAST
					: PLAN_BUDGET;
		const caps = { name: "plan" as const, ...budget };
		if (!isHarnessBudgetEnforceOn()) {
			return {
				...caps,
				max_rounds: caps.max_rounds,
				max_exchanges_per_round: Math.max(caps.max_exchanges_per_round, 2),
				round_token_cap: caps.round_token_cap * 2,
				debate_global_cap: caps.debate_global_cap * 2,
			};
		}
		return caps;
	}
	const caps = {
		name: "aggressive" as const,
		min_focus_rounds: 1,
		max_exchanges_per_round: 1,
		...AGGRESSIVE_BUDGET,
	};
	if (!isHarnessBudgetEnforceOn()) {
		return {
			...caps,
			max_rounds: caps.max_rounds,
			max_exchanges_per_round: Math.max(caps.max_exchanges_per_round, 2),
			round_token_cap: caps.round_token_cap * 2,
			debate_global_cap: caps.debate_global_cap * 2,
		};
	}
	return caps;
}

function participantAllowed(
	participant: string,
	phase: DebateState["debate_phase"],
): boolean {
	if (phase === "plan") {
		return (PLAN_DEBATE_PARTICIPANTS as readonly string[]).includes(
			participant,
		);
	}
	return (POST_EXECUTE_DEBATE_PARTICIPANTS as readonly string[]).includes(
		participant,
	);
}

async function ensureDebatesDir(): Promise<void> {
	await mkdir(DEBATES_DIR, { recursive: true });
}

export async function writeDebateEvent(
	debateId: string,
	event: unknown,
): Promise<void> {
	await ensureDebatesDir();
	const path = join(DEBATES_DIR, `${debateId}.jsonl`);
	await appendFile(path, `${JSON.stringify(event)}\n`, "utf-8");
}

function decidePolicy(
	severity: SeverityScores,
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

export function parseRoundEnvelope(
	raw: string,
): BusEnvelope<RoundPayload> | null {
	try {
		const parsed = JSON.parse(raw) as BusEnvelope<RoundPayload>;
		if (parsed?.protocol !== "pi-debate-bus/v1") return null;
		if (parsed?.kind !== "round") return null;
		return parsed;
	} catch {
		return null;
	}
}

export interface DebateBusHooks {
	appendEntry: (customType: string, data: unknown) => void;
}

export interface OpenDebateBusOptions {
	debate_profile?: DebateProfile;
	required_focuses?: DebateState["required_focuses"];
}

export async function openDebateBus(
	runId: string,
	debateId: string,
	hooks: DebateBusHooks,
	opts?: OpenDebateBusOptions,
): Promise<DebateState> {
	const profile = opts?.debate_profile ?? "standard";
	const caps = capsForDebate(debateId, profile);
	const debate_phase = debatePhaseFromId(debateId);
	const defaultFocuses: PlanDebateFocus[] =
		profile === "light" ? ["spec", "quality"] : [...PLAN_FOCUS_AREAS];
	const required_focuses =
		opts?.required_focuses && opts.required_focuses.length > 0
			? opts.required_focuses
			: defaultFocuses;
	const next: DebateState = {
		run_id: runId,
		debate_id: debateId,
		debate_phase,
		round_count: 0,
		budget_used: 0,
		min_focus_rounds: caps.min_focus_rounds,
		max_rounds: caps.max_rounds,
		max_exchanges_per_round: caps.max_exchanges_per_round,
		round_token_cap: caps.round_token_cap,
		debate_global_cap: caps.debate_global_cap,
		last_review_gate_ready: false,
		debate_profile: profile,
		required_focuses,
	};
	setDebateState(next);
	setLastSeverity({
		correctness: 0,
		security: 0,
		architecture: 0,
		test_integrity: 0,
	});
	hooks.appendEntry("harness-debate-state", next);
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
			debate_phase,
			budget_profile: caps.name,
			debate_profile: profile,
			required_focuses,
		},
	};
	hooks.appendEntry("harness-debate-envelope", envelope);
	await writeDebateEvent(debateId, envelope);
	return next;
}

async function emitBudgetExhausted(
	state: DebateState,
	reason: string,
	hooks: DebateBusHooks,
): Promise<void> {
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
				min_focus_rounds: state.min_focus_rounds,
				max_rounds: state.max_rounds,
				max_exchanges_per_round: state.max_exchanges_per_round,
				round_token_cap: state.round_token_cap,
				debate_global_cap: state.debate_global_cap,
			},
			minimum_evidence_confidence: 0.6,
			default_policy_outcome: "block",
			human_override_allowed: true,
		},
	};
	hooks.appendEntry("harness-debate-envelope", envelope);
	if (shouldEmitBlockingBudgetExhausted()) {
		hooks.appendEntry("harness-budget-exhausted", envelope.payload);
	} else {
		const telemetryPayload = {
			...(envelope.payload as Record<string, unknown>),
			telemetry_only: true,
		};
		hooks.appendEntry("harness-debate-budget-telemetry", telemetryPayload);
		hooks.appendEntry("harness-budget-telemetry", {
			...telemetryPayload,
			source: "debate-bus",
		});
	}
	await writeDebateEvent(state.debate_id, envelope);
}

export async function acceptDebateRound(
	envelope: BusEnvelope<RoundPayload>,
	hooks: DebateBusHooks,
): Promise<{ ok: boolean; reason?: string; state?: DebateState }> {
	const state = getDebateState();
	if (!state) return { ok: false, reason: "no active debate" };
	if (state.debate_id !== envelope.correlation.debate_id) {
		return { ok: false, reason: "debate id mismatch" };
	}

	for (const p of envelope.payload.participants ?? []) {
		if (!participantAllowed(p, state.debate_phase)) {
			return {
				ok: false,
				reason: `participant ${p} invalid for debate_phase=${state.debate_phase}`,
			};
		}
	}

	const nextRound = state.round_count + 1;
	if (nextRound > state.max_rounds) {
		await emitBudgetExhausted(state, "max_rounds_reached", hooks);
		if (HARD_STOP_DEBATE_CAPS) {
			return { ok: false, reason: "max rounds reached" };
		}
	}

	const perAgent = envelope.payload.token_usage?.per_agent ?? {};
	for (const [agent, tokens] of Object.entries(perAgent)) {
		if (Number(tokens) > state.round_token_cap) {
			await emitBudgetExhausted(state, "round_token_cap_exceeded", hooks);
			if (HARD_STOP_DEBATE_CAPS) {
				return { ok: false, reason: `round cap exceeded by ${agent}` };
			}
		}
	}

	const roundTotal = Number(envelope.payload.token_usage?.round_total ?? 0);
	if (state.budget_used + roundTotal > state.debate_global_cap) {
		await emitBudgetExhausted(state, "debate_global_cap_exceeded", hooks);
		if (HARD_STOP_DEBATE_CAPS) {
			return { ok: false, reason: "global cap exceeded" };
		}
	}

	state.round_count = nextRound;
	state.budget_used += roundTotal;
	if (envelope.payload.review_gate_ready === true) {
		state.last_review_gate_ready = true;
	}
	if (envelope.payload.review_gate_ready === false) {
		state.last_review_gate_ready = false;
	}
	setDebateState(state);
	hooks.appendEntry("harness-debate-state", state);

	if (envelope.payload.severity_scores) {
		setLastSeverity({
			correctness: toSafeFloat(envelope.payload.severity_scores.correctness),
			security: toSafeFloat(envelope.payload.severity_scores.security),
			architecture: toSafeFloat(envelope.payload.severity_scores.architecture),
			test_integrity: toSafeFloat(
				envelope.payload.severity_scores.test_integrity,
			),
		});
	}

	const profileName =
		state.debate_phase === "plan" ? ("plan" as const) : ("aggressive" as const);

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
			name: profileName,
			min_focus_rounds: state.min_focus_rounds,
			max_rounds: state.max_rounds,
			max_exchanges_per_round: state.max_exchanges_per_round,
			round_token_cap: state.round_token_cap,
			debate_global_cap: state.debate_global_cap,
		},
		consensus_delta: Number(envelope.payload.consensus_delta ?? 0),
		review_gate_ready: envelope.payload.review_gate_ready,
	};
	hooks.appendEntry("harness-round-result", roundRecord);
	hooks.appendEntry("harness-debate-envelope", envelope);
	await writeDebateEvent(state.debate_id, envelope);
	return { ok: true, state };
}

export async function finalizeDebateConsensus(
	rationale: string,
	hooks: DebateBusHooks,
): Promise<PolicyDecision | null> {
	const state = getDebateState();
	if (!state) return null;
	const lastSeverity = getLastSeverity();
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
	const planPhase = state.debate_phase === "plan";
	let evaluatorPassed = true;
	let debateComplete = state.round_count > 0;
	if (planPhase) {
		const runDir = join(process.cwd(), ".pi", "harness", "runs", state.run_id);
		const requiredFocuses =
			state.required_focuses && state.required_focuses.length > 0
				? state.required_focuses
				: undefined;
		const coverage = await getPlanFocusCoverage(runDir, {
			requiredFocuses,
		});
		evaluatorPassed =
			coverage.last_review_gate_ready || Boolean(state.last_review_gate_ready);
		debateComplete = planDebateOutcomeComplete(coverage, {
			requiredFocuses,
			minRoundIndex: state.min_focus_rounds,
		});
	}

	const consensus = {
		schema_version: "1.0.0",
		contract_version: "1.0.0",
		run_id: state.run_id,
		debate_id: state.debate_id,
		debate_phase: state.debate_phase,
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
		strict_gate_prerequisites: planPhase
			? {
					plan_gate_passed: false,
					execution_completed: false,
					evaluator_passed: evaluatorPassed,
					adversarial_debate_completed: debateComplete,
					severity_policy_ok: decision !== "block",
					benchmark_delta_checks_passed: false,
					rollback_artifacts_generated: false,
				}
			: {
					plan_gate_passed: true,
					execution_completed: true,
					evaluator_passed: true,
					adversarial_debate_completed: debateComplete,
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
	hooks.appendEntry("harness-consensus-packet", consensus);
	hooks.appendEntry("harness-debate-envelope", envelope);
	await writeDebateEvent(state.debate_id, envelope);
	return decision;
}
