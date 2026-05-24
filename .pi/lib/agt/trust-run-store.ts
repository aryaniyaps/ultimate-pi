import { TrustManager } from "@microsoft/agent-governance-sdk";

const stores = new Map<string, TrustManager>();

export function getTrustManagerForRun(runId: string): TrustManager {
	let tm = stores.get(runId);
	if (!tm) {
		tm = new TrustManager({ initialScore: 0.85, decayFactor: 0.98 });
		stores.set(runId, tm);
	}
	return tm;
}

export function recordPolicyDeny(runId: string, agentDid: string): void {
	const tm = getTrustManagerForRun(runId);
	tm.recordFailure(agentDid, 0.08);
}

export function recordPolicyAllow(runId: string, agentDid: string): void {
	const tm = getTrustManagerForRun(runId);
	tm.recordSuccess(agentDid, 0.02);
}

export function trustScoreForAgent(runId: string, agentDid: string): number {
	return getTrustManagerForRun(runId).getTrustScore(agentDid).overall;
}
