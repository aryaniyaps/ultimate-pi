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
