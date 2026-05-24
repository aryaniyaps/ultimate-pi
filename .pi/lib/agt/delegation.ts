import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getOrCreateParentIdentity } from "./identity-registry.js";

const ROLE_CAPABILITIES: Record<string, string[]> = {
	planner: ["harness.read", "harness.submit.plan"],
	executor: ["harness.read", "harness.write", "harness.submit.run"],
	evaluator: ["harness.read", "harness.submit.review"],
	adversary: ["harness.read", "harness.submit.review"],
	tie_breaker: ["harness.read", "harness.submit.review"],
	meta: ["harness.read"],
	trace: ["harness.read"],
	incident: ["harness.read"],
	other: ["harness.read"],
};

export function capabilitiesForHarnessAgent(
	agentId: string,
	kind: string,
): string[] {
	if (agentId.startsWith("harness/planning/")) {
		return ROLE_CAPABILITIES.planner ?? ["harness.read"];
	}
	return ROLE_CAPABILITIES[kind] ?? ROLE_CAPABILITIES.other;
}

export interface DelegationBundle {
	agentDid: string;
	delegationCeiling: number;
	identityPath: string;
}

export function mintSubagentDelegation(input: {
	runId: string;
	runDir: string;
	agentId: string;
	agentKind: string;
	trustCeiling?: number;
}): DelegationBundle {
	const parent = getOrCreateParentIdentity(input.runId, input.runDir);
	const caps = capabilitiesForHarnessAgent(input.agentId, input.agentKind);
	const safeId = input.agentId.replace(/\//g, "_");
	const agentDir = join(input.runDir, "agents", safeId);
	mkdirSync(agentDir, { recursive: true });

	const child = parent.delegate(`harness-${safeId}`, caps, {
		description: `Harness subagent ${input.agentId}`,
	});
	writeFileSync(
		join(agentDir, "identity.json"),
		JSON.stringify(child.toJSON(), null, 2),
	);

	const ceiling = input.trustCeiling ?? 1;
	return {
		agentDid: child.did,
		delegationCeiling: ceiling,
		identityPath: join(agentDir, "identity.json"),
	};
}

export function delegationEnvFromBundle(
	bundle: DelegationBundle,
): Record<string, string> {
	return {
		HARNESS_AGENT_DID: bundle.agentDid,
		HARNESS_DELEGATION_CEILING: String(bundle.delegationCeiling),
	};
}
