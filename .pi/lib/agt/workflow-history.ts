/** Lightweight workflow flags from session custom entries (observation-bus parity). */

type EntryLike = {
	type?: string;
	customType?: string;
	data?: { kind?: string; flags?: string[] };
};

export function workflowFlagsFromEntries(entries: unknown[]): Set<string> {
	const flags = new Set<string>();
	for (const raw of entries) {
		const entry = raw as EntryLike;
		if (entry.type !== "custom") continue;
		if (entry.customType !== "harness-observation") continue;
		const data = entry.data;
		if (!data?.flags) continue;
		for (const f of data.flags) {
			if (typeof f === "string") flags.add(f);
		}
	}
	return flags;
}

export function workflowBlocked(
	flags: Set<string>,
	requiredPrior: string,
): boolean {
	return !flags.has(requiredPrior);
}
