import {
	CircuitBreaker,
	GovernanceMetrics,
} from "@microsoft/agent-governance-sdk";

let metrics: GovernanceMetrics | null = null;
const breakers = new Map<string, CircuitBreaker>();

export function getHarnessGovernanceMetrics(): GovernanceMetrics {
	if (!metrics) {
		metrics = new GovernanceMetrics();
	}
	return metrics;
}

export function getSpawnCircuitBreaker(runId: string): CircuitBreaker {
	let cb = breakers.get(runId);
	if (!cb) {
		cb = new CircuitBreaker(5, 60_000);
		breakers.set(runId, cb);
	}
	return cb;
}

export function isSreEnforceEnabled(): boolean {
	return process.env.HARNESS_AGT_SRE_ENFORCE === "1";
}

export function recordSpawnAttempt(runId: string, ok: boolean): void {
	const cb = getSpawnCircuitBreaker(runId);
	if (ok) {
		cb.onSuccess();
	} else {
		cb.onFailure();
	}
	getHarnessGovernanceMetrics().recordPolicyDecision(ok ? "allow" : "deny", 0, {
		run_id: runId,
		kind: "harness_spawn",
	});
}

export function spawnCircuitOpen(runId: string): boolean {
	if (!isSreEnforceEnabled()) return false;
	return !getSpawnCircuitBreaker(runId).canExecute();
}
