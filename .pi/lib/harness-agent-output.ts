/**
 * Parse structured JSON blocks from harness subagent assistant output.
 */

const JSON_FENCE_RE = /```(?:json)?\s*([\s\S]*?)```/i;

export function extractJsonBlock(text: string): string | null {
	const trimmed = text.trim();
	if (trimmed.startsWith("{")) {
		return trimmed;
	}
	const match = JSON_FENCE_RE.exec(text);
	if (match?.[1]) {
		return match[1].trim();
	}
	const lastBrace = trimmed.lastIndexOf("{");
	const lastClose = trimmed.lastIndexOf("}");
	if (lastBrace >= 0 && lastClose > lastBrace) {
		return trimmed.slice(lastBrace, lastClose + 1);
	}
	return null;
}

export interface ToolCallPartLike {
	type?: string;
	name?: string;
	arguments?: Record<string, unknown>;
}

export interface MessageLike {
	role?: string;
	content?: ToolCallPartLike[] | unknown;
}

/** Last matching submit_* tool call in subprocess messages (chain-safe). */
export function extractLastSubmitCall(
	messages: MessageLike[],
	toolNames: string | string[],
): { toolName: string; document: Record<string, unknown> } | null {
	const allowed = new Set(
		(Array.isArray(toolNames) ? toolNames : [toolNames]).map((n) => n.trim()),
	);
	let last: { toolName: string; document: Record<string, unknown> } | null =
		null;
	for (const msg of messages) {
		if (msg.role !== "assistant" || !Array.isArray(msg.content)) continue;
		for (const part of msg.content) {
			if (part.type !== "toolCall" || !part.name) continue;
			if (!allowed.has(part.name)) continue;
			const doc = part.arguments?.document;
			if (doc && typeof doc === "object" && !Array.isArray(doc)) {
				last = {
					toolName: part.name,
					document: doc as Record<string, unknown>,
				};
			}
		}
	}
	return last;
}

export function extractLastSubmitCallForAgent(
	messages: MessageLike[],
	agentToolNames: readonly string[],
): { toolName: string; document: Record<string, unknown> } | null {
	return extractLastSubmitCall(messages, [...agentToolNames]);
}

export function parseHarnessAgentJson<T extends Record<string, unknown>>(
	text: string,
): { ok: true; value: T } | { ok: false; error: string } {
	const block = extractJsonBlock(text);
	if (!block) {
		return { ok: false, error: "no JSON block found in subagent output" };
	}
	try {
		const value = JSON.parse(block) as T;
		if (!value || typeof value !== "object") {
			return { ok: false, error: "parsed value is not an object" };
		}
		return { ok: true, value };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { ok: false, error: message };
	}
}
