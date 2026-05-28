const denyCounts = new Map<string, number>();
/** Sessions cleared after /harness-plan or /harness-auto starts a fresh plan attempt. */
const disarmedKillSwitchSessions = new Set<string>();

export function disarmHarnessKillSwitch(sessionId: string): void {
	disarmedKillSwitchSessions.add(sessionId);
}

export function armHarnessKillSwitch(sessionId: string): void {
	disarmedKillSwitchSessions.delete(sessionId);
}

export function isHarnessKillSwitchDisarmed(sessionId: string): boolean {
	return disarmedKillSwitchSessions.has(sessionId);
}

export function recordHarnessPolicyDeny(sessionId: string): number {
	const n = (denyCounts.get(sessionId) ?? 0) + 1;
	denyCounts.set(sessionId, n);
	return n;
}

export function resetHarnessPolicyDenyCount(sessionId: string): void {
	denyCounts.delete(sessionId);
}
