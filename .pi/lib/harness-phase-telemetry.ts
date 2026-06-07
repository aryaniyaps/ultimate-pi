/**
 * Phase boundary telemetry helpers (harness_phase_completed, phase_started_at).
 */

import type { HarnessPhase } from "./harness-run-context.js";

const phaseStartedAt = new Map<string, number>();
const phaseCompletedKeys = new Set<string>();
const phaseSubagentCounts = new Map<string, number>();

function phaseKey(runId: string, phase: HarnessPhase): string {
	return `${runId}:${phase}`;
}

export function recordHarnessPhaseStart(
	runId: string,
	phase: HarnessPhase,
): void {
	const key = phaseKey(runId, phase);
	if (!phaseStartedAt.has(key)) {
		phaseStartedAt.set(key, Date.now());
	}
}

export function incrementHarnessPhaseSubagentCount(
	runId: string,
	phase: HarnessPhase,
	delta = 1,
): void {
	const key = phaseKey(runId, phase);
	phaseSubagentCounts.set(key, (phaseSubagentCounts.get(key) ?? 0) + delta);
}

export function phaseTerminalArtifact(
	artifactPath: string,
): HarnessPhase | null {
	const norm = artifactPath.replace(/\\/g, "/");
	if (norm === "artifacts/task-clarification.yaml") return "plan";
	if (norm === "plan-packet.yaml") return "plan";
	if (norm === "handoff/executor-summary.yaml") return "execute";
	if (norm === "artifacts/review-outcome.yaml") return "evaluate";
	return null;
}

export function buildPhaseCompletedPayload(
	runId: string,
	phase: HarnessPhase,
): {
	harness_run_id: string;
	run_id: string;
	harness_phase: HarnessPhase;
	duration_ms: number;
	subagent_count: number;
} | null {
	const key = phaseKey(runId, phase);
	if (phaseCompletedKeys.has(key)) return null;

	const started = phaseStartedAt.get(key) ?? Date.now();
	phaseCompletedKeys.add(key);

	return {
		harness_run_id: runId,
		run_id: runId,
		harness_phase: phase,
		duration_ms: Math.max(0, Date.now() - started),
		subagent_count: phaseSubagentCounts.get(key) ?? 0,
	};
}

export function resetHarnessPhaseTelemetryForTests(): void {
	phaseStartedAt.clear();
	phaseCompletedKeys.clear();
	phaseSubagentCounts.clear();
}

export function getHarnessPhaseSubagentCount(
	runId: string,
	phase: HarnessPhase,
): number {
	return phaseSubagentCounts.get(phaseKey(runId, phase)) ?? 0;
}
