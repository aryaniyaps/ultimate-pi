/**
 * harness-web-guard — block bash that bypasses web_search / web_fetch tools.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const BLOCK_REASON =
	"harness-web-guard: use web_search (tier=deep for research), web_fetch, web_find_similar, or web_contents — " +
	"not raw curl/wget/firecrawl/scrapling fetch. See web-retrieval skill. " +
	"Setup may use harness-web.py status directly.";

const ALLOW_PATTERNS = [
	/harness-web\.py\b/i,
	/harness-cli-verify\.sh\b/i,
	/\bgraphify\b/i,
	/\bctx7\b/i,
	/\bcontext7\b/i,
	/\bgit\b/i,
	/harness-searxng-bootstrap/i,
];

const BLOCK_PATTERNS: Array<{ re: RegExp; note: string }> = [
	{ re: /\bfirecrawl\b/i, note: "firecrawl" },
	{
		re: /\b(?:curl|wget)\b[^\n|;&]*\s+https?:\/\//i,
		note: "curl/wget http(s)",
	},
	{
		re: /\bscrapling\s+(?:fetch|extract)\b/i,
		note: "scrapling fetch/extract",
	},
];

function isBootstrapPrompt(prompt: string): boolean {
	const p = prompt.toLowerCase();
	return (
		p.includes("/harness-setup") ||
		p.includes("harness-setup") ||
		p.includes("full harness bootstrap")
	);
}

function latestUserPrompt(ctx: {
	sessionManager: { getEntries(): unknown[] };
}): string {
	const entries = ctx.sessionManager.getEntries() as Array<{
		type?: string;
		message?: { role?: string; content?: unknown };
	}>;
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry?.message?.role !== "user") continue;
		const content = entry.message.content;
		if (typeof content === "string") return content;
		if (Array.isArray(content)) {
			return content
				.map((part) =>
					typeof part === "object" && part && "text" in part
						? String((part as { text?: string }).text ?? "")
						: "",
				)
				.join("\n");
		}
	}
	return "";
}

function isAllowedBash(command: string): boolean {
	return ALLOW_PATTERNS.some((re) => re.test(command));
}

function blockedWebBash(command: string): string | null {
	if (isAllowedBash(command)) return null;
	for (const { re, note } of BLOCK_PATTERNS) {
		if (re.test(command)) return note;
	}
	return null;
}

export default function harnessWebGuard(pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash") return undefined;

		const prompt = latestUserPrompt(ctx);
		if (isBootstrapPrompt(prompt)) return undefined;

		const command = String((event.input as { command?: string }).command ?? "");
		const hit = blockedWebBash(command);
		if (!hit) return undefined;

		return {
			block: true,
			reason: `${BLOCK_REASON} (matched: ${hit})`,
		};
	});
}
