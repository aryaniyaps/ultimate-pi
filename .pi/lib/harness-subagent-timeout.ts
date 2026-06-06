/**
 * Phase-aware default timeouts for harness subagent subprocesses.
 */

import type { HarnessPhase } from "./harness-run-context.js";

function parsePositiveMs(value: string | undefined): number | undefined {
	if (!value?.trim()) return undefined;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function isHarnessSubagentTimeoutDisabled(): boolean {
	return process.env.HARNESS_SUBAGENT_TIMEOUT_DISABLE === "1";
}

function inferPhaseFromAgent(agentId: string | undefined): HarnessPhase | null {
	if (!agentId) return null;
	if (agentId.startsWith("harness/running/")) return "execute";
	if (agentId.startsWith("harness/reviewing/")) return "evaluate";
	if (agentId.startsWith("harness/planning/")) return "plan";
	return null;
}

/**
 * Resolve subprocess timeout (ms). Phase-specific env wins over PI_SUBAGENT_TIMEOUT_MS.
 * Returns undefined when timeouts are disabled or no cap is configured.
 */
export function resolveHarnessSubagentTimeoutMs(
	phase: HarnessPhase,
	agentId?: string,
): number | undefined {
	if (isHarnessSubagentTimeoutDisabled()) return undefined;

	const global = parsePositiveMs(process.env.PI_SUBAGENT_TIMEOUT_MS);
	const effectivePhase = inferPhaseFromAgent(agentId) ?? phase;

	let phaseDefault: number | undefined;
	switch (effectivePhase) {
		case "execute":
			phaseDefault =
				parsePositiveMs(process.env.HARNESS_SUBAGENT_TIMEOUT_EXECUTE_MS) ??
				2_700_000;
			break;
		case "evaluate":
		case "adversary":
			phaseDefault =
				parsePositiveMs(process.env.HARNESS_SUBAGENT_TIMEOUT_REVIEW_MS) ??
				1_200_000;
			break;
		default:
			phaseDefault =
				parsePositiveMs(process.env.HARNESS_SUBAGENT_TIMEOUT_PLAN_MS) ??
				1_800_000;
			break;
	}

	const phaseEnv =
		effectivePhase === "execute"
			? parsePositiveMs(process.env.HARNESS_SUBAGENT_TIMEOUT_EXECUTE_MS)
			: effectivePhase === "evaluate" || effectivePhase === "adversary"
				? parsePositiveMs(process.env.HARNESS_SUBAGENT_TIMEOUT_REVIEW_MS)
				: parsePositiveMs(process.env.HARNESS_SUBAGENT_TIMEOUT_PLAN_MS);

	return phaseEnv ?? global ?? phaseDefault;
}

/** Pick the strictest (lowest) timeout when spawning multiple harness agents. */
export function resolveHarnessSubagentTimeoutForAgents(
	phase: HarnessPhase,
	agentIds: string[],
): number | undefined {
	if (agentIds.length === 0) {
		return resolveHarnessSubagentTimeoutMs(phase);
	}
	const caps = agentIds
		.map((id) => resolveHarnessSubagentTimeoutMs(phase, id))
		.filter((v): v is number => v != null);
	if (caps.length === 0) return undefined;
	return Math.min(...caps);
}
