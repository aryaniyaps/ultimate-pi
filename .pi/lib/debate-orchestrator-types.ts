/** Shared debate bus participant types (plan + post-execute). */

export type PostExecuteDebateParticipant =
	| "EvaluatorAgent"
	| "AdversaryAgent"
	| "TieBreakerAgent";

export type PlanDebateParticipant =
	| "PlanEvaluatorAgent"
	| "PlanAdversaryAgent"
	| "HypothesisValidatorAgent"
	| "SprintContractAuditorAgent"
	| "ReviewIntegratorAgent"
	| "StackResearchAgent";

export type DebateParticipant =
	| PostExecuteDebateParticipant
	| PlanDebateParticipant;

export const PLAN_DEBATE_PARTICIPANTS: PlanDebateParticipant[] = [
	"PlanEvaluatorAgent",
	"PlanAdversaryAgent",
	"HypothesisValidatorAgent",
	"SprintContractAuditorAgent",
	"ReviewIntegratorAgent",
	"StackResearchAgent",
];

export const POST_EXECUTE_DEBATE_PARTICIPANTS: PostExecuteDebateParticipant[] =
	["EvaluatorAgent", "AdversaryAgent", "TieBreakerAgent"];

export function isPlanDebateId(debateId: string): boolean {
	return debateId.startsWith("plan-");
}

export function debatePhaseFromId(debateId: string): "plan" | "post_execute" {
	return isPlanDebateId(debateId) ? "plan" : "post_execute";
}
