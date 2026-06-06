/**
 * In-process progress state for harness live widget + stderr heartbeat.
 */

export type HarnessWaitGate = "ask_user" | "approve_plan" | null;

export interface HarnessProgressSnapshot {
	activeSubagentAgents: string[];
	harnessPhase: string | null;
	subagentStartedAtMs: number | null;
	waitingGate: HarnessWaitGate;
	waitingStartedAtMs: number | null;
	lastHeartbeatLine: string | null;
}

let snapshot: HarnessProgressSnapshot = {
	activeSubagentAgents: [],
	harnessPhase: null,
	subagentStartedAtMs: null,
	waitingGate: null,
	waitingStartedAtMs: null,
	lastHeartbeatLine: null,
};

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function formatElapsed(ms: number): string {
	const totalSec = Math.max(0, Math.floor(ms / 1000));
	const min = Math.floor(totalSec / 60);
	const sec = totalSec % 60;
	return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

export function getHarnessProgressSnapshot(): HarnessProgressSnapshot {
	return { ...snapshot };
}

export function setHarnessSubagentProgress(args: {
	agentIds: string[];
	phase: string | null;
}): void {
	snapshot = {
		...snapshot,
		activeSubagentAgents: [...args.agentIds],
		harnessPhase: args.phase,
		subagentStartedAtMs: Date.now(),
		waitingGate: null,
		waitingStartedAtMs: null,
	};
}

export function clearHarnessSubagentProgress(): void {
	snapshot = {
		...snapshot,
		activeSubagentAgents: [],
		subagentStartedAtMs: null,
		lastHeartbeatLine: null,
	};
	stopHarnessSubagentHeartbeat();
}

export function setHarnessWaitingForUser(gate: HarnessWaitGate): void {
	snapshot = {
		...snapshot,
		waitingGate: gate,
		waitingStartedAtMs: gate ? Date.now() : null,
	};
	if (!gate) {
		snapshot.waitingStartedAtMs = null;
	}
}

export function buildHarnessProgressStatusLine(): string | null {
	const now = Date.now();
	if (snapshot.waitingGate && snapshot.waitingStartedAtMs != null) {
		const elapsed = formatElapsed(now - snapshot.waitingStartedAtMs);
		const label =
			snapshot.waitingGate === "approve_plan" ? "plan approval" : "your input";
		return `Waiting for ${label} (${elapsed})`;
	}
	if (
		snapshot.activeSubagentAgents.length > 0 &&
		snapshot.subagentStartedAtMs != null
	) {
		const elapsed = formatElapsed(now - snapshot.subagentStartedAtMs);
		const agents = snapshot.activeSubagentAgents
			.map((a) => a.replace(/^harness\//, ""))
			.join(", ");
		const phase = snapshot.harnessPhase ?? "harness";
		return `${phase} · ${agents} · ${elapsed}`;
	}
	return null;
}

export function startHarnessSubagentHeartbeat(
	onTick: (line: string) => void,
	intervalMs = 30_000,
): void {
	stopHarnessSubagentHeartbeat();
	heartbeatTimer = setInterval(() => {
		const line = buildHarnessProgressStatusLine();
		if (!line) return;
		snapshot = { ...snapshot, lastHeartbeatLine: line };
		onTick(line);
	}, intervalMs);
	if (typeof heartbeatTimer.unref === "function") {
		heartbeatTimer.unref();
	}
}

export function stopHarnessSubagentHeartbeat(): void {
	if (heartbeatTimer) {
		clearInterval(heartbeatTimer);
		heartbeatTimer = null;
	}
}
