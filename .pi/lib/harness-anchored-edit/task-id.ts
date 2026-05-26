/** Per-session anchor state scope for hash reconciliation. */
export function anchoredEditTaskId(ctx?: { sessionId?: string }): string {
	return (
		ctx?.sessionId?.trim() ||
		process.env.PI_SESSION_ID?.trim() ||
		"harness-default"
	);
}
