const denyCounts = new Map<string, number>();

export function recordHarnessPolicyDeny(sessionId: string): number {
	const n = (denyCounts.get(sessionId) ?? 0) + 1;
	denyCounts.set(sessionId, n);
	return n;
}

export function resetHarnessPolicyDenyCount(sessionId: string): void {
	denyCounts.delete(sessionId);
}
