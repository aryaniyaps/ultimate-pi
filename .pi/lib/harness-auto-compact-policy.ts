/**
 * Harness 50% auto-compact gate policy (testable without pi runtime).
 */

import {
	resolveCompactAuto,
	resolveCompactRearmPercent,
	resolveCompactSubagents,
	resolveCompactThresholdPercent,
} from "./harness-vcc-settings.js";

export interface CompactUsage {
	percent: number | null;
	tokens?: number;
	contextWindow?: number;
}

export interface CompactGateState {
	armed: boolean;
	inFlight: boolean;
	cooldownTurns: number;
	subagentSpawnPending: boolean;
}

export interface CompactGateDecision {
	shouldCompact: boolean;
	reason?: string;
}

export function createCompactGateState(): CompactGateState {
	return {
		armed: true,
		inFlight: false,
		cooldownTurns: 0,
		subagentSpawnPending: false,
	};
}

export function evaluateAutoCompactGate(
	usage: CompactUsage,
	state: CompactGateState,
	opts?: { isSubagent?: boolean },
): CompactGateDecision {
	if (!resolveCompactAuto()) {
		return { shouldCompact: false, reason: "HARNESS_COMPACT_AUTO=false" };
	}
	if (opts?.isSubagent && !resolveCompactSubagents()) {
		return { shouldCompact: false, reason: "subagent compact disabled" };
	}
	if (state.subagentSpawnPending) {
		return { shouldCompact: false, reason: "defer until subagent idle" };
	}
	if (state.inFlight) {
		return { shouldCompact: false, reason: "compaction in flight" };
	}
	if (state.cooldownTurns > 0) {
		return { shouldCompact: false, reason: "VCC cancel cooldown" };
	}
	if (!state.armed) {
		const rearm = resolveCompactRearmPercent();
		if (usage.percent != null && usage.percent < rearm) {
			state.armed = true;
		} else {
			return { shouldCompact: false, reason: "hysteresis disarmed" };
		}
	}
	const threshold = resolveCompactThresholdPercent();
	if (usage.percent == null) {
		return { shouldCompact: false, reason: "usage percent null" };
	}
	if (usage.percent < threshold) {
		return { shouldCompact: false, reason: "below threshold" };
	}
	return { shouldCompact: true };
}

export function onSessionCompact(state: CompactGateState): void {
	state.armed = false;
	state.inFlight = false;
}

export function onCompactCancel(state: CompactGateState): void {
	state.inFlight = false;
	state.cooldownTurns = 2;
}
