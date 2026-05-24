import { ExecutionRing, RingEnforcer } from "@microsoft/agent-governance-sdk";

const KIND_RING: Record<string, ExecutionRing> = {
	planner: ExecutionRing.Ring0,
	executor: ExecutionRing.Ring2,
	evaluator: ExecutionRing.Ring0,
	adversary: ExecutionRing.Ring3,
	tie_breaker: ExecutionRing.Ring0,
	meta: ExecutionRing.Ring0,
	trace: ExecutionRing.Ring0,
	incident: ExecutionRing.Ring0,
	other: ExecutionRing.Ring3,
};

export function ringForHarnessAgentKind(kind: string): ExecutionRing {
	return KIND_RING[kind] ?? ExecutionRing.Ring3;
}

export function createRingEnforcer(): RingEnforcer {
	return new RingEnforcer();
}
