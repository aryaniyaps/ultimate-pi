/**
 * Shared blackboard for orchestrator ↔ subagent handoffs (~8k injection cap).
 */

import type {
	BlackboardEntry,
	BlackboardQuery,
	PostMetadata,
} from "./types-blackboard.js";

const MAX_VALUE_DISPLAY_CHARS = 500;
export const MAX_SERIALIZE_TOTAL_CHARS = 8_000;

function truncateForDisplay(value: unknown): string {
	const str =
		typeof value === "string" ? value : JSON.stringify(value, null, 2);
	if (str.length <= MAX_VALUE_DISPLAY_CHARS) return str;
	return `${str.slice(0, MAX_VALUE_DISPLAY_CHARS)}...(truncated)`;
}

type PostHandler = (key: string, entry: BlackboardEntry) => void;

export class Blackboard {
	private entries = new Map<string, BlackboardEntry>();
	private postHandlers: PostHandler[] = [];

	post(
		namespacedKey: string,
		value: unknown,
		agentId: string,
		agentName: string,
		metadata?: PostMetadata,
	): void {
		if (metadata?.supersedes) {
			this.entries.delete(metadata.supersedes);
		}

		const entry: BlackboardEntry = {
			key: namespacedKey,
			value,
			agentId,
			agentName,
			timestamp: Date.now(),
			metadata,
		};

		this.entries.set(namespacedKey, entry);

		for (const handler of this.postHandlers) {
			try {
				handler(namespacedKey, entry);
			} catch {
				/* ignore */
			}
		}
	}

	get(key: string): BlackboardEntry | undefined {
		return this.entries.get(key);
	}

	getAll(): Map<string, BlackboardEntry> {
		return new Map(this.entries);
	}

	query(query: BlackboardQuery): BlackboardEntry[] {
		let results = [...this.entries.values()];

		if (query.keys?.length) {
			results = results.filter((e) => query.keys?.includes(e.key));
		}

		if (query.pattern) {
			const pat = query.pattern;
			if (pat instanceof RegExp) {
				results = results.filter((e) => pat.test(e.key));
			} else {
				const escaped = pat.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
				const re = new RegExp(`^${escaped.replace(/\*/g, ".*")}$`);
				results = results.filter((e) => re.test(e.key) || e.key.includes(pat));
			}
		}

		if (query.agentId) {
			results = results.filter((e) => e.agentId === query.agentId);
		}
		if (query.agentName) {
			results = results.filter((e) => e.agentName === query.agentName);
		}
		if (query.category) {
			results = results.filter((e) => e.metadata?.category === query.category);
		}
		if (query.after !== undefined) {
			results = results.filter((e) => e.timestamp > query.after!);
		}

		return results;
	}

	serialize(query?: BlackboardQuery): string {
		const entries = query ? this.query(query) : [...this.entries.values()];

		if (entries.length === 0) return "(blackboard is empty)";

		const lines: string[] = [`Blackboard (${entries.length} entries):`];
		let totalChars = lines[0].length;

		for (const entry of entries) {
			const summary = entry.metadata?.summary
				? entry.metadata.summary
				: truncateForDisplay(entry.value);
			const category = entry.metadata?.category
				? ` [${entry.metadata.category}]`
				: "";
			const ts = new Date(entry.timestamp).toISOString().slice(11, 19);
			const keyLine = `  ${entry.key}${category} (${entry.agentName} @ ${ts})`;
			const valLine = `    ${summary}`;
			const entryChars = keyLine.length + valLine.length + 2;

			if (totalChars + entryChars > MAX_SERIALIZE_TOTAL_CHARS) {
				lines.push(
					"  ... (more entries truncated — use blackboard query with specific keys)",
				);
				break;
			}
			lines.push(keyLine, valLine);
			totalChars += entryChars;
		}

		return lines.join("\n");
	}

	toJSON(query?: BlackboardQuery): object {
		const entries = query ? this.query(query) : [...this.entries.values()];
		return {
			count: entries.length,
			entries: entries.map((e) => ({
				key: e.key,
				agentId: e.agentId,
				agentName: e.agentName,
				timestamp: e.timestamp,
				summary: e.metadata?.summary ?? null,
				category: e.metadata?.category ?? null,
				value: e.value,
			})),
		};
	}

	clear(): void {
		this.entries.clear();
	}

	restore(data: {
		key: string;
		value: unknown;
		agentId: string;
		agentName: string;
		timestamp: number;
		metadata?: PostMetadata;
	}): void {
		this.entries.set(data.key, { ...data });
	}

	delete(key: string): boolean {
		return this.entries.delete(key);
	}

	get size(): number {
		return this.entries.size;
	}

	on(event: "post", handler: PostHandler): void {
		if (event === "post") this.postHandlers.push(handler);
	}
}
