import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AgentIdentity } from "@microsoft/agent-governance-sdk";

const runRoots = new Map<string, AgentIdentity>();

export function getOrCreateParentIdentity(
	runId: string,
	runDir: string,
): AgentIdentity {
	const cached = runRoots.get(runId);
	if (cached) return cached;

	const agentsDir = join(runDir, "agents", "_parent");
	const identityPath = join(agentsDir, "identity.json");
	mkdirSync(agentsDir, { recursive: true });

	if (existsSync(identityPath)) {
		const json = JSON.parse(readFileSync(identityPath, "utf-8"));
		const restored = AgentIdentity.fromJSON(json);
		runRoots.set(runId, restored);
		return restored;
	}

	const identity = AgentIdentity.generate(`harness-parent-${runId}`, [
		"harness.orchestrate",
		"harness.delegate",
		"harness.plan",
		"harness.execute",
	]);
	writeFileSync(identityPath, JSON.stringify(identity.toJSON(), null, 2));
	runRoots.set(runId, identity);
	return identity;
}

export function loadChildIdentity(agentDir: string): AgentIdentity | null {
	const identityPath = join(agentDir, "identity.json");
	if (!existsSync(identityPath)) return null;
	const json = JSON.parse(readFileSync(identityPath, "utf-8"));
	return AgentIdentity.fromJSON(json);
}
