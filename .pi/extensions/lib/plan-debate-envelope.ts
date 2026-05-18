/**
 * Plan Review Gate — convert integrator YAML to debate bus round JSON.
 */

import type { DebateParticipant } from "../../lib/debate-orchestrator-types.js";

export interface PlanReviewRoundDraft {
	schema_version: string;
	round_index: number;
	debate_round_focus?: string;
	round_summary?: string;
	validation_summary?: string;
	adversary_summary?: string;
	disputes?: string[];
	recommended_packet_patches?: Array<{ path: string; value: unknown }>;
	review_gate_ready?: boolean;
	participants?: DebateParticipant[];
	claims?: string[];
	rebuttals?: string[];
	evidence_refs?: string[];
	token_usage?: {
		per_agent: Record<string, number>;
		round_total: number;
	};
	consensus_delta?: number;
	severity_scores?: {
		correctness: number;
		security: number;
		architecture: number;
		test_integrity: number;
	};
}

export function buildPlanReviewRoundEnvelope(
	draft: PlanReviewRoundDraft,
	opts: { runId: string; debateId: string },
): {
	protocol: "pi-debate-bus/v1";
	kind: "round";
	correlation: {
		run_id: string;
		debate_id: string;
		round_index: number;
		sender: DebateParticipant;
	};
	payload: {
		participants: DebateParticipant[];
		claims: string[];
		rebuttals: string[];
		evidence_refs: string[];
		token_usage: { per_agent: Record<string, number>; round_total: number };
		consensus_delta: number;
		severity_scores?: PlanReviewRoundDraft["severity_scores"];
	};
} {
	const participants = (draft.participants ?? [
		"PlanEvaluatorAgent",
		"PlanAdversaryAgent",
		"ReviewIntegratorAgent",
	]) as DebateParticipant[];

	return {
		protocol: "pi-debate-bus/v1",
		kind: "round",
		correlation: {
			run_id: opts.runId,
			debate_id: opts.debateId,
			round_index: draft.round_index,
			sender: "ReviewIntegratorAgent",
		},
		payload: {
			participants,
			claims: draft.claims ?? [draft.round_summary ?? "review round"],
			rebuttals: draft.rebuttals ?? draft.disputes ?? [],
			evidence_refs: draft.evidence_refs ?? [],
			token_usage: draft.token_usage ?? {
				per_agent: { ReviewIntegratorAgent: 0 },
				round_total: 0,
			},
			consensus_delta: draft.consensus_delta ?? 0,
			severity_scores: draft.severity_scores,
		},
	};
}
