import { Agent, Cursor, type ModelSelection } from "@cursor/sdk";
import {
	calculateCost,
	createAssistantMessageEventStream,
	type Api,
	type AssistantMessage,
	type AssistantMessageEventStream,
	type Context,
	type ImageContent,
	type Model,
	type SimpleStreamOptions,
	type TextContent,
	type Tool,
} from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { parseCursorTranscriptToolCalls } from "../internal/cursor-sdk-transcript-parser";

type ReasoningLevel = "minimal" | "low" | "medium" | "high" | "xhigh";
type CursorAgentFactory = typeof Agent.create;
const DEFAULT_CURSOR_AGENT_FACTORY: CursorAgentFactory = Agent.create.bind(Agent);
let createCursorAgent: CursorAgentFactory = DEFAULT_CURSOR_AGENT_FACTORY;
const MODEL_LIST_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedAvailableModelIds: Set<string> | undefined;
let availableModelIdsFetchedAt = 0;
let availableModelIdsInFlight: Promise<Set<string>> | undefined;

export function __setCursorAgentFactoryForTests(factory?: CursorAgentFactory): void {
	createCursorAgent = factory ?? DEFAULT_CURSOR_AGENT_FACTORY;
}

type ModelVariants = {
	default: string;
	minimal?: string;
	low?: string;
	medium?: string;
	high?: string;
	xhigh?: string;
};

const LEGACY_CURSOR_MODEL_ALIASES: Record<string, { id: string; reasoning?: ReasoningLevel }> = {
	"claude-opus-4-7-xhigh": { id: "claude-opus-4-6", reasoning: "xhigh" },
	"claude-opus-4-7-max": { id: "claude-opus-4-6", reasoning: "xhigh" },
	"claude-opus-4-7-high": { id: "claude-opus-4-6", reasoning: "high" },
	"claude-opus-4-7-medium": { id: "claude-opus-4-6", reasoning: "medium" },
	"claude-opus-4-7-low": { id: "claude-opus-4-6", reasoning: "low" },
	"gpt-5.3-codex-fast": { id: "gpt-5.3-codex", reasoning: "low" },
	"gpt-5.5-high": { id: "gpt-5.2", reasoning: "high" },
	"gpt-5.5-extra-high": { id: "gpt-5.2", reasoning: "xhigh" },
	"claude-4.5-sonnet": { id: "claude-sonnet-4-5" },
	"claude-4.5-sonnet-thinking": { id: "claude-sonnet-4-5", reasoning: "high" },
	"claude-4.5-opus-high": { id: "claude-opus-4-5", reasoning: "high" },
};

const MODEL_MAP: Record<string, ModelVariants> = {
	"claude-sonnet-4-5": {
		default: "sonnet-4.5",
		minimal: "sonnet-4.5-thinking",
		low: "sonnet-4.5-thinking",
		medium: "sonnet-4.5-thinking",
		high: "sonnet-4.5-thinking",
		xhigh: "sonnet-4.5-thinking",
	},
	"claude-sonnet-4-6": {
		default: "sonnet-4.6",
		minimal: "sonnet-4.6-thinking",
		low: "sonnet-4.6-thinking",
		medium: "sonnet-4.6-thinking",
		high: "sonnet-4.6-thinking",
		xhigh: "sonnet-4.6-thinking",
	},
	"claude-opus-4-5": {
		default: "opus-4.5",
		minimal: "opus-4.5-thinking",
		low: "opus-4.5-thinking",
		medium: "opus-4.5-thinking",
		high: "opus-4.5-thinking",
		xhigh: "opus-4.5-thinking",
	},
	"claude-opus-4-6": {
		default: "opus-4.6",
		minimal: "opus-4.6-thinking",
		low: "opus-4.6-thinking",
		medium: "opus-4.6-thinking",
		high: "opus-4.6-thinking",
		xhigh: "opus-4.6-thinking",
	},
	"gpt-5.2": {
		default: "gpt-5.2",
		high: "gpt-5.2-high",
		xhigh: "gpt-5.2-high",
	},
	"gpt-5.2-codex": {
		default: "gpt-5.2-codex",
		minimal: "gpt-5.2-codex-low",
		low: "gpt-5.2-codex-low",
		high: "gpt-5.2-codex-high",
		xhigh: "gpt-5.2-codex-xhigh",
	},
	"gpt-5.3-codex": {
		default: "gpt-5.3-codex",
		minimal: "gpt-5.3-codex-low",
		low: "gpt-5.3-codex-low",
		high: "gpt-5.3-codex-high",
		xhigh: "gpt-5.3-codex-xhigh",
	},
	"gpt-5.1": { default: "gpt-5.1-high" },
	"gpt-5.1-codex-max": {
		default: "gpt-5.1-codex-max",
		high: "gpt-5.1-codex-max-high",
		xhigh: "gpt-5.1-codex-max-high",
	},
	"gemini-3-pro-preview": { default: "gemini-3-pro" },
	"gemini-3-flash-preview": { default: "gemini-3-flash" },
	"grok-code-fast-1": { default: "grok" },
};

const MODEL_ID_ALIASES: Record<string, string[]> = {
	"auto": ["auto", "default", "composer-2"],
	"claude-sonnet-4-5": ["claude-sonnet-4-5", "sonnet-4.5", "claude-sonnet-4"],
	"claude-sonnet-4-6": ["claude-sonnet-4-6", "sonnet-4.6"],
	"claude-opus-4-5": ["claude-opus-4-5", "opus-4.5"],
	"claude-opus-4-6": ["claude-opus-4-6", "opus-4.6"],
	"gpt-5.1": ["gpt-5.1-high", "gpt-5.1"],
	"gpt-5.1-codex-max": ["gpt-5.1-codex-max", "gpt-5.1-codex-mini"],
	"gpt-5.2": ["gpt-5.2-high", "gpt-5.2"],
	"gpt-5.2-codex": ["gpt-5.2-codex"],
	"gpt-5.3-codex": ["gpt-5.3-codex", "gpt-5.3-codex-spark"],
	"gpt-5.3-codex-fast": ["gpt-5.3-codex-fast", "gpt-5.3-codex", "gpt-5.3-codex-low"],
	"gpt-5.5-high": ["gpt-5.5-high", "gpt-5.2-high", "gpt-5.2"],
	"gpt-5.5-extra-high": ["gpt-5.5-extra-high", "gpt-5.2-high", "gpt-5.2"],
	"claude-opus-4-7-low": ["claude-opus-4-7-low", "opus-4.6-thinking", "claude-opus-4-6"],
	"claude-opus-4-7-medium": ["claude-opus-4-7-medium", "opus-4.6-thinking", "claude-opus-4-6"],
	"claude-opus-4-7-high": ["claude-opus-4-7-high", "opus-4.6-thinking", "claude-opus-4-6"],
	"claude-opus-4-7-max": ["claude-opus-4-7-max", "opus-4.6-thinking", "claude-opus-4-6"],
	"claude-opus-4-7-xhigh": ["claude-opus-4-7-xhigh", "opus-4.6-thinking", "claude-opus-4-6"],
	"claude-4.5-sonnet": ["claude-4.5-sonnet", "sonnet-4.5", "claude-sonnet-4-5"],
	"claude-4.5-sonnet-thinking": ["claude-4.5-sonnet-thinking", "sonnet-4.5-thinking", "claude-sonnet-4-5"],
	"claude-4.5-opus-high": ["claude-4.5-opus-high", "opus-4.5-thinking", "claude-opus-4-5"],
	"gemini-3-pro-preview": ["gemini-3-pro-preview", "gemini-3-pro", "gemini-3.1-pro"],
	"gemini-3-flash-preview": ["gemini-3-flash-preview", "gemini-3-flash", "gemini-2.5-flash"],
	"grok-code-fast-1": ["grok-code-fast-1", "grok", "grok-4.3", "grok-4-20"],
	"composer-2": ["composer-2", "default", "composer-1.5"],
};

const PROVIDER_MODELS = [
	{ id: "auto", name: "Auto (Cursor)", reasoning: false, contextWindow: 200000, maxTokens: 32768 },
	{ id: "claude-sonnet-4-5", name: "Claude 4.5 Sonnet (Cursor)", reasoning: true, contextWindow: 200000, maxTokens: 32000 },
	{ id: "claude-sonnet-4-6", name: "Claude 4.6 Sonnet (Cursor)", reasoning: true, contextWindow: 200000, maxTokens: 32000 },
	{ id: "claude-opus-4-5", name: "Claude 4.5 Opus (Cursor)", reasoning: true, contextWindow: 200000, maxTokens: 32000 },
	{ id: "claude-opus-4-6", name: "Claude 4.6 Opus (Cursor)", reasoning: true, contextWindow: 200000, maxTokens: 32000 },
	{ id: "gpt-5.1", name: "GPT-5.1 (Cursor)", reasoning: false, contextWindow: 200000, maxTokens: 32768 },
	{ id: "gpt-5.1-codex-max", name: "GPT-5.1 Codex Max (Cursor)", reasoning: true, contextWindow: 200000, maxTokens: 32768 },
	{ id: "gpt-5.2", name: "GPT-5.2 (Cursor)", reasoning: true, contextWindow: 200000, maxTokens: 32768 },
	{ id: "gpt-5.2-codex", name: "GPT-5.2 Codex (Cursor)", reasoning: true, contextWindow: 200000, maxTokens: 32768 },
	{ id: "gpt-5.3-codex", name: "GPT-5.3 Codex (Cursor)", reasoning: true, contextWindow: 200000, maxTokens: 32768 },
	{ id: "gpt-5.3-codex-fast", name: "GPT-5.3 Codex Fast (Cursor, alias)", reasoning: true, contextWindow: 200000, maxTokens: 32768 },
	{ id: "gpt-5.5-high", name: "GPT-5.5 High (Cursor, alias)", reasoning: true, contextWindow: 200000, maxTokens: 32768 },
	{ id: "gpt-5.5-extra-high", name: "GPT-5.5 Extra High (Cursor, alias)", reasoning: true, contextWindow: 200000, maxTokens: 32768 },
	{ id: "claude-opus-4-7-low", name: "Claude Opus 4.7 Low (Cursor, alias)", reasoning: true, contextWindow: 200000, maxTokens: 32000 },
	{ id: "claude-opus-4-7-medium", name: "Claude Opus 4.7 Medium (Cursor, alias)", reasoning: true, contextWindow: 200000, maxTokens: 32000 },
	{ id: "claude-opus-4-7-high", name: "Claude Opus 4.7 High (Cursor, alias)", reasoning: true, contextWindow: 200000, maxTokens: 32000 },
	{ id: "claude-opus-4-7-max", name: "Claude Opus 4.7 Max (Cursor, alias)", reasoning: true, contextWindow: 200000, maxTokens: 32000 },
	{ id: "claude-opus-4-7-xhigh", name: "Claude Opus 4.7 XHigh (Cursor, alias)", reasoning: true, contextWindow: 200000, maxTokens: 32000 },
	{ id: "claude-4.5-sonnet", name: "Claude 4.5 Sonnet (Cursor, alias)", reasoning: true, contextWindow: 200000, maxTokens: 32000 },
	{ id: "claude-4.5-sonnet-thinking", name: "Claude 4.5 Sonnet Thinking (Cursor, alias)", reasoning: true, contextWindow: 200000, maxTokens: 32000 },
	{ id: "claude-4.5-opus-high", name: "Claude 4.5 Opus High (Cursor, alias)", reasoning: true, contextWindow: 200000, maxTokens: 32000 },
	{ id: "gemini-3-pro-preview", name: "Gemini 3 Pro (Cursor)", reasoning: false, contextWindow: 1000000, maxTokens: 65536 },
	{ id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Cursor)", reasoning: false, contextWindow: 1000000, maxTokens: 65536 },
	{ id: "grok-code-fast-1", name: "Grok (Cursor)", reasoning: false, contextWindow: 131072, maxTokens: 32768 },
	{ id: "composer-2", name: "Composer 2 (Cursor)", reasoning: false, contextWindow: 200000, maxTokens: 32768 },
];

type ProviderModelEntry = (typeof PROVIDER_MODELS)[number];

function getAliasCandidates(id: string): string[] {
	return MODEL_ID_ALIASES[id] ?? [id];
}

function supportsModelId(id: string, available: Set<string>): boolean {
	return getAliasCandidates(id).some((candidate) => available.has(candidate));
}

function resolveSupportedModelId(preferred: string, canonicalId: string, available: Set<string>): string {
	if (available.has(preferred)) {
		return preferred;
	}

	const candidates = [
		...getAliasCandidates(preferred),
		...getAliasCandidates(canonicalId),
		...getAliasCandidates("auto"),
	];
	for (const candidate of candidates) {
		if (available.has(candidate)) {
			return candidate;
		}
	}
	return preferred;
}

async function getAvailableCursorModelIds(forceRefresh = false): Promise<Set<string>> {
	const now = Date.now();
	if (!forceRefresh && cachedAvailableModelIds && now - availableModelIdsFetchedAt < MODEL_LIST_CACHE_TTL_MS) {
		return cachedAvailableModelIds;
	}
	if (availableModelIdsInFlight) {
		return availableModelIdsInFlight;
	}

	availableModelIdsInFlight = (async () => {
		const apiKey = process.env.CURSOR_API_KEY;
		if (!apiKey) {
			return cachedAvailableModelIds ?? new Set<string>();
		}
		try {
			const models = await Cursor.models.list({ apiKey });
			const ids = new Set<string>(models.map((model) => model.id));
			cachedAvailableModelIds = ids;
			availableModelIdsFetchedAt = Date.now();
			return ids;
		} catch {
			return cachedAvailableModelIds ?? new Set<string>();
		}
	})();

	try {
		return await availableModelIdsInFlight;
	} finally {
		availableModelIdsInFlight = undefined;
	}
}

async function getDynamicProviderModels(forceRefresh = false): Promise<ProviderModelEntry[]> {
	const available = await getAvailableCursorModelIds(forceRefresh);
	if (available.size === 0) {
		return PROVIDER_MODELS;
	}
	return PROVIDER_MODELS.filter((model) => supportsModelId(model.id, available));
}

function toProviderModelConfig(model: ProviderModelEntry) {
	return {
		id: model.id,
		name: model.name,
		reasoning: model.reasoning,
		input: ["text"] as ("text" | "image")[],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: model.contextWindow,
		maxTokens: model.maxTokens,
	};
}

function registerCursorProviderModels(pi: ExtensionAPI, models: ProviderModelEntry[]): void {
	pi.registerProvider("cursor", {
		baseUrl: "cursor://sdk",
		apiKey: "CURSOR_API_KEY",
		api: "cursor-sdk" as Api,
		models: models.map(toProviderModelConfig),
		streamSimple: streamCursorSdk,
	});
}

async function toCursorModelId(canonicalId: string, reasoning?: string): Promise<string> {
	const normalizedId = canonicalId.startsWith("cursor/") ? canonicalId.slice("cursor/".length) : canonicalId;
	const legacyAlias = LEGACY_CURSOR_MODEL_ALIASES[normalizedId];
	const resolvedCanonicalId = legacyAlias?.id ?? normalizedId;
	const resolvedReasoning = legacyAlias?.reasoning ?? (reasoning as ReasoningLevel | undefined);
	const family = MODEL_MAP[resolvedCanonicalId];
	const preferredModelId = family
		? (() => {
				const level = resolvedReasoning;
				const variant = level ? family[level] : undefined;
				return variant ?? family.default;
			})()
		: resolvedCanonicalId;

	const available = await getAvailableCursorModelIds();
	if (available.size === 0) {
		return preferredModelId;
	}
	return resolveSupportedModelId(preferredModelId, resolvedCanonicalId, available);
}

function contentBlockToText(block: TextContent | ImageContent): string {
	if (block.type === "text") {
		return block.text;
	}
	const bytes = Math.round((block.data.length * 3) / 4);
	return `[Image: ${block.mimeType}, ~${bytes} bytes]`;
}

function formatTools(tools: Tool[] | undefined): string {
	if (!tools || tools.length === 0) {
		return "";
	}

	const lines = ["[Available Pi Tools]"];
	for (const tool of tools) {
		lines.push(`- ${tool.name}: ${tool.description}`);
		lines.push(`  schema: ${JSON.stringify(tool.parameters)}`);
	}
	lines.push(
		"When tool needed, reply ONLY with fenced block:",
		"```pi_tool_call",
		'{"name":"tool_name","arguments":{}}',
		"```",
		"No extra text before/after fence when calling tool.",
		"Never use emoji.",
		"Never add markdown decoration unless explicitly requested.",
	);

	return lines.join("\n");
}

function serializeContext(context: Context): string {
	const lines: string[] = [];

	if (context.systemPrompt) {
		lines.push(`[System]\n${context.systemPrompt}`);
	}

	const toolsSection = formatTools(context.tools);
	if (toolsSection) {
		lines.push(toolsSection);
	}

	for (const msg of context.messages) {
		if (msg.role === "user") {
			const text = typeof msg.content === "string" ? msg.content : msg.content.map(contentBlockToText).join("\n");
			lines.push(`[User]\n${text}`);
			continue;
		}

		if (msg.role === "assistant") {
			const text = msg.content
				.filter((c): c is TextContent => c.type === "text")
				.map((c) => c.text)
				.join("\n");
			if (text.trim().length > 0) {
				lines.push(`[Assistant]\n${text}`);
			}
			continue;
		}

		const text = msg.content.map(contentBlockToText).join("\n");
		if (text.trim().length > 0) {
			lines.push(`[Tool result: ${msg.toolName}]\n${text}`);
		}
	}

	return lines.join("\n\n");
}

function estimateTokens(text: string): number {
	if (!text) return 0;
	return Math.max(1, Math.ceil(text.length / 4));
}

function applyUsage(model: Model<Api>, output: AssistantMessage, promptText: string, finalText: string): void {
	output.usage.input = estimateTokens(promptText);
	output.usage.output = estimateTokens(finalText);
	output.usage.cacheRead = 0;
	output.usage.cacheWrite = 0;
	output.usage.totalTokens = output.usage.input + output.usage.output;
	output.usage.cost = calculateCost(model, output.usage);
}

function parsePiToolCall(text: string, context: Context): { name: string; arguments: Record<string, unknown> } | undefined {
	if (!context.tools || context.tools.length === 0) {
		return undefined;
	}

	const fenced = text.match(/```pi_tool_call\s*([\s\S]*?)```/i)?.[1]?.trim();
	const candidates = [fenced, text.trim()].filter((v): v is string => Boolean(v));

	for (const candidate of candidates) {
		try {
			const parsed = JSON.parse(candidate) as { name?: unknown; arguments?: unknown };
			if (typeof parsed.name !== "string") {
				continue;
			}
			if (!context.tools.some((t) => t.name === parsed.name)) {
				continue;
			}
			const args = parsed.arguments;
			if (!args || typeof args !== "object" || Array.isArray(args)) {
				return { name: parsed.name, arguments: {} };
			}
			return { name: parsed.name, arguments: args as Record<string, unknown> };
		} catch {
			// try next candidate
		}
	}
	return undefined;
}

function parseBracketToolCall(text: string, context: Context): { name: string; arguments: Record<string, unknown> } | undefined {
	if (!context.tools || context.tools.length === 0) {
		return undefined;
	}

	const extractBalancedJson = (input: string): string | undefined => {
		const start = input.indexOf("{");
		if (start === -1) return undefined;
		let depth = 0;
		let inString = false;
		let escaped = false;
		for (let i = start; i < input.length; i++) {
			const ch = input[i];
			if (inString) {
				if (escaped) {
					escaped = false;
					continue;
				}
				if (ch === "\\") {
					escaped = true;
					continue;
				}
				if (ch === "\"") {
					inString = false;
				}
				continue;
			}
			if (ch === "\"") {
				inString = true;
				continue;
			}
			if (ch === "{") {
				depth++;
				continue;
			}
			if (ch === "}") {
				depth--;
				if (depth === 0) {
					return input.slice(start, i + 1);
				}
			}
		}
		return undefined;
	};

	const extractBestEffortArgs = (input: string): Record<string, unknown> | undefined => {
		const args: Record<string, unknown> = {};

		const command = input.match(/"command"\s*:\s*"([^"\n\r]*)/);
		if (command?.[1]) args.command = command[1];

		const workingDirectory = input.match(/"workingDirectory"\s*:\s*"([^"\n\r]*)/);
		if (workingDirectory?.[1] !== undefined) args.workingDirectory = workingDirectory[1];

		const path = input.match(/"path"\s*:\s*"([^"\n\r]*)/);
		if (path?.[1]) args.path = path[1];

		const pattern = input.match(/"pattern"\s*:\s*"([^"\n\r]*)/);
		if (pattern?.[1]) args.pattern = pattern[1];

		const timeout = input.match(/"timeout"\s*:\s*(\d+)/);
		if (timeout?.[1]) args.timeout = Number(timeout[1]);

		return Object.keys(args).length > 0 ? args : undefined;
	};

	const lines = text.split("\n");
	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i]?.trim();
		if (!line) continue;
		const match = line.match(/^(?:⏳\s*)?\[([^\]]+)\]\s*(.*)$/);
		if (!match) continue;
		const [, rawName, inlinePayload] = match;
		const toolName = context.tools.find((tool) => tool.name.toLowerCase() === rawName.trim().toLowerCase())?.name;
		if (!toolName) continue;

		const trailingText = lines.slice(i).join("\n");
		const rawArgs =
			extractBalancedJson(inlinePayload) ??
			extractBalancedJson(trailingText);
		if (!rawArgs) {
			const fallbackArgs = extractBestEffortArgs(trailingText);
			if (fallbackArgs) {
				return { name: toolName, arguments: fallbackArgs };
			}
			continue;
		}
		try {
			const args = JSON.parse(rawArgs);
			if (!args || typeof args !== "object" || Array.isArray(args)) {
				return { name: toolName, arguments: {} };
			}
			return { name: toolName, arguments: args as Record<string, unknown> };
		} catch {
			const fallbackArgs = extractBestEffortArgs(trailingText);
			if (fallbackArgs) {
				return { name: toolName, arguments: fallbackArgs };
			}
		}
	}
	return undefined;
}

function extractThinkingTextFromTranscript(text: string): { thinking: string; remainingText: string } {
	const lines = text.split("\n");
	const thinkingLines: string[] = [];
	const remainingLines: string[] = [];

	for (const line of lines) {
		const raw = line.trim();
		const stripped = raw.replace(/^[⠋⠙⠸⠴⠦⠇⠏✻•*]+\s*/, "");
		const thinkingMatch = stripped.match(/^Thinking\.\.\.\s*:?\s*(.*)$/i);
		if (thinkingMatch) {
			if (thinkingMatch[1]) thinkingLines.push(thinkingMatch[1]);
			continue;
		}
		remainingLines.push(line);
	}

	return {
		thinking: thinkingLines.join("\n").trim(),
		remainingText: remainingLines.join("\n"),
	};
}

function stripToolCallMarkup(text: string): string {
	return text
		.replace(/```pi_tool_call\s*[\s\S]*?```/gi, "")
		.replace(/\{\s*"name"\s*:\s*"[^"]+"\s*,\s*"arguments"\s*:\s*\{[\s\S]*?\}\s*\}/g, "")
		.replace(/(?:^|\n)\s*(?:⏳\s*)?\[[^\]]+\]\s*\{[\s\S]*?(?=\n(?:\s*(?:Status|Actions)\s*:|$)|$)/g, "")
		.replace(/(?:^|\n)\s*⏺\s*[a-zA-Z0-9._-]+\s*[\s\S]*?```json\s*[\s\S]*?```\s*[\s\S]*?```[\s\S]*?```/g, "")
		.replace(/^.*?\n(?=\s*⏺\s*[a-zA-Z0-9._-]+\s*$)/s, "")
		.trim();
}

function normalizeParsedToolCallArgs(
	name: string,
	arguments_: Record<string, unknown>,
): Record<string, unknown> {
	const tool = name.toLowerCase();
	const args = { ...arguments_ };
	delete args.toolCallId;
	delete args.call_id;

	if (tool === "shell" || tool === "bash") {
		const command = typeof args.command === "string" ? args.command : "";
		const workingDirectory =
			typeof args.working_directory === "string"
				? args.working_directory
				: typeof args.workingDirectory === "string"
					? args.workingDirectory
					: typeof args.cwd === "string"
						? args.cwd
						: undefined;
		const blockUntilMs =
			typeof args.block_until_ms === "number"
				? args.block_until_ms
				: typeof args.timeout === "number"
					? args.timeout
					: undefined;

		const normalized: Record<string, unknown> = { command };
		if (workingDirectory && workingDirectory.trim().length > 0) {
			normalized.working_directory = workingDirectory.trim();
		}
		if (typeof blockUntilMs === "number" && Number.isFinite(blockUntilMs) && blockUntilMs >= 0) {
			normalized.block_until_ms = Math.floor(blockUntilMs);
		}
		if (typeof args.description === "string" && args.description.trim().length > 0) {
			normalized.description = args.description.trim();
		}
		return normalized;
	}

	if (tool === "glob") {
		const normalized: Record<string, unknown> = {};
		if (typeof args.globPattern === "string") normalized.glob_pattern = args.globPattern;
		else if (typeof args.pattern === "string") normalized.glob_pattern = args.pattern;
		if (typeof args.targetDirectory === "string") normalized.target_directory = args.targetDirectory;
		return normalized;
	}

	if (tool === "read") {
		return typeof args.path === "string" ? { path: args.path } : {};
	}

	if (tool === "edit") {
		const path = typeof args.path === "string" ? args.path : undefined;
		const edits = Array.isArray(args.edits) ? args.edits : undefined;
		if (edits && edits.length > 0) {
			return path ? { path, edits } : { edits };
		}

		const oldText =
			typeof args.oldText === "string"
				? args.oldText
				: typeof args.old_string === "string"
					? args.old_string
					: undefined;
		const newText =
			typeof args.newText === "string"
				? args.newText
				: typeof args.new_string === "string"
					? args.new_string
					: undefined;
		if (path && oldText !== undefined && newText !== undefined) {
			return { path, edits: [{ oldText, newText }] };
		}

		// Incomplete "edit path" pseudo-calls should be remapped upstream.
		return path ? { path } : {};
	}

	return args;
}

function likelyNeedsTool(text: string): boolean {
	const lower = text.toLowerCase();
	const signals = ["use ", "run ", "read ", "write ", "edit ", "find ", "grep ", "list ", "ls ", "bash ", "command", "file", "directory", "tool"];
	return signals.some((s) => lower.includes(s));
}

const CURSOR_SDK_NOISE_PATTERNS: readonly RegExp[] = [
	/\bmanaged_skills\.(?:removed|added|updated)\b/,
	/\bLocalCursorRulesService load completed\b/,
	/\bAgentSkillsCursorRulesService load completed\b/,
	/\bCursorPluginsAgentSkillsService load completed\b/,
	/^\s*[⠋⠙⠸⠴⠦⠇⠏]\s+Working\.\.\.\s*$/,
];

function isCursorSdkNoiseChunk(chunk: string): boolean {
	const normalized = chunk.replace(/\u001b\[[0-9;]*m/g, "").trim();
	if (!normalized) return false;
	return CURSOR_SDK_NOISE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function stripCursorSdkNoise(chunk: string): string {
	// Keep carriage-return spinner frames intact while filtering; splitting on '\r'
	// turns transient updates into visible multiple lines in the TUI.
	const lines = chunk.split("\n");
	const kept: string[] = [];
	for (const line of lines) {
		const normalized = line.replace(/\u001b\[[0-9;]*m/g, "").replace(/\r/g, "").trim();
		if (normalized.length > 0 && isCursorSdkNoiseChunk(normalized)) {
			continue;
		}
		kept.push(line);
	}
	return kept.join("\n");
}

async function withCursorSdkNoiseSuppressed<T>(run: () => Promise<T>): Promise<T> {
	const originalStdoutWrite = process.stdout.write.bind(process.stdout);
	const originalStderrWrite = process.stderr.write.bind(process.stderr);

	const filteredWrite = (
		originalWrite: (chunk: string | Uint8Array, encoding?: BufferEncoding, cb?: (error?: Error | null) => void) => boolean,
		chunk: string | Uint8Array,
		encoding?: BufferEncoding,
		cb?: (error?: Error | null) => void,
	): boolean => {
		const text = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString(encoding ?? "utf8");
		const sanitized = stripCursorSdkNoise(text);
		if (!sanitized) {
			cb?.(null);
			return true;
		}
		return originalWrite(sanitized, encoding, cb);
	};

	process.stdout.write = ((chunk: string | Uint8Array, encoding?: BufferEncoding, cb?: (error?: Error | null) => void) =>
		filteredWrite(originalStdoutWrite, chunk, encoding, cb)) as typeof process.stdout.write;
	process.stderr.write = ((chunk: string | Uint8Array, encoding?: BufferEncoding, cb?: (error?: Error | null) => void) =>
		filteredWrite(originalStderrWrite, chunk, encoding, cb)) as typeof process.stderr.write;

	try {
		return await run();
	} finally {
		process.stdout.write = originalStdoutWrite as typeof process.stdout.write;
		process.stderr.write = originalStderrWrite as typeof process.stderr.write;
	}
}

function streamCursorSdk(model: Model<Api>, context: Context, options?: SimpleStreamOptions): AssistantMessageEventStream {
	const stream = createAssistantMessageEventStream();

	const availableTools = context.tools?.map((tool) => tool.name) ?? [];
	const resolveToolName = (candidates: string[]): string | undefined => {
		for (const candidate of candidates) {
			if (availableTools.includes(candidate)) {
				return candidate;
			}
		}
		for (const candidate of candidates) {
			const matched = availableTools.find((tool) => tool.toLowerCase() === candidate.toLowerCase());
			if (matched) {
				return matched;
			}
		}
		return undefined;
	};

	const mapCursorTool = (name: string, input: unknown): { name: string; arguments: Record<string, unknown> } | undefined => {
		const n = name.toLowerCase();
		const args = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
		if (n === "read") {
			const mappedName = resolveToolName(["Read", "read", "ReadFile", "readfile"]);
			if (!mappedName) return undefined;
			return { name: mappedName, arguments: { path: args.path ?? "" } };
		}
		if (n === "shell" || n === "bash") {
			const mappedName = resolveToolName(["Shell", "bash", "shell", "Bash"]);
			if (!mappedName) return undefined;
			return { name: mappedName, arguments: { command: args.command ?? "" } };
		}
		if (n === "ls") {
			const mappedName = resolveToolName(["LS", "ls", "List"]);
			if (!mappedName) return undefined;
			return { name: mappedName, arguments: { path: args.path ?? "." } };
		}
		if (n === "grep") {
			const mappedName = resolveToolName(["Grep", "grep", "Search"]);
			if (!mappedName) return undefined;
			return { name: mappedName, arguments: { pattern: args.pattern ?? "", path: args.path ?? "." } };
		}
		if (n === "glob" || n === "find") {
			const mappedName = resolveToolName(["Find", "find"]);
			if (!mappedName) return undefined;
			return { name: mappedName, arguments: { pattern: args.globPattern ?? args.pattern ?? "**/*", path: args.targetDirectory ?? "." } };
		}
		if (n === "write") {
			const mappedName = resolveToolName(["Write", "write"]);
			if (!mappedName) return undefined;
			return { name: mappedName, arguments: { path: args.path ?? "", content: args.fileText ?? "" } };
		}
		if (n === "edit") {
			const editToolName = resolveToolName(["Edit", "edit"]);
			const path = typeof args.path === "string" ? args.path : "";
			const edits = Array.isArray(args.edits) ? args.edits : undefined;
			const oldText =
				typeof args.oldText === "string"
					? args.oldText
					: typeof args.old_string === "string"
						? args.old_string
						: undefined;
			const newText =
				typeof args.newText === "string"
					? args.newText
					: typeof args.new_string === "string"
						? args.new_string
						: undefined;

			// Preserve Edit intent even when args are incomplete so the TUI
			// still renders the edit call instead of silently converting it.
			if ((!edits || edits.length === 0) && (oldText === undefined || newText === undefined)) {
				return editToolName ? { name: editToolName, arguments: { path } } : undefined;
			}

			if (!editToolName) {
				return undefined;
			}

			if (edits && edits.length > 0) {
				return { name: editToolName, arguments: { path, edits } };
			}
			return {
				name: editToolName,
				arguments: {
					path,
					edits: [{ oldText: oldText ?? "", newText: newText ?? "" }],
				},
			};
		}
		const passthrough = resolveToolName([name, n]);
		if (!passthrough) return undefined;
		return { name: passthrough, arguments: args };
	};

	const emitToolCallBlock = (output: AssistantMessage, mapped: { name: string; arguments: Record<string, unknown> }, id?: string): void => {
		const contentIndex = output.content.length;
		const toolCallId = id || `call_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
		const piToolCall = {
			type: "toolCall" as const,
			id: toolCallId,
			name: mapped.name,
			arguments: mapped.arguments,
		};
		output.content.push(piToolCall);
		stream.push({ type: "toolcall_start", contentIndex, partial: output });
		stream.push({
			type: "toolcall_delta",
			contentIndex,
			delta: JSON.stringify(mapped.arguments),
			partial: output,
		});
		stream.push({ type: "toolcall_end", contentIndex, toolCall: piToolCall, partial: output });
	};

	(async () => {
		let runCancel: (() => Promise<void>) | undefined;
		let aborted = false;
		let sawPiToolCall = false;
		let plainText = "";
		let activeTextContentIndex: number | undefined;
		let activeThinkingContentIndex: number | undefined;
		const emittedToolCallIds = new Set<string>();

		const output: AssistantMessage = {
			role: "assistant",
			content: [],
			api: model.api,
			provider: model.provider,
			model: model.id,
			usage: {
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0,
				totalTokens: 0,
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
			},
			stopReason: "stop",
			timestamp: Date.now(),
		};

		const onAbort = () => {
			aborted = true;
			void runCancel?.();
		};

		const appendTextDelta = (text: string): void => {
			if (!text) return;
			plainText += text;
			if (activeTextContentIndex === undefined) {
				activeTextContentIndex = output.content.length;
				output.content.push({ type: "text", text: "" });
				stream.push({ type: "text_start", contentIndex: activeTextContentIndex, partial: output });
			}
			const current = output.content[activeTextContentIndex] as TextContent;
			current.text += text;
			stream.push({ type: "text_delta", contentIndex: activeTextContentIndex, delta: text, partial: output });
		};

		const closeActiveTextBlock = (): void => {
			if (activeTextContentIndex === undefined) return;
			const current = output.content[activeTextContentIndex] as TextContent;
			stream.push({
				type: "text_end",
				contentIndex: activeTextContentIndex,
				content: current.text,
				partial: output,
			});
			activeTextContentIndex = undefined;
		};

		const appendThinkingDelta = (text: string): void => {
			if (!text) return;
			if (activeThinkingContentIndex === undefined) {
				activeThinkingContentIndex = output.content.length;
				output.content.push({ type: "thinking", thinking: "" });
				stream.push({ type: "thinking_start", contentIndex: activeThinkingContentIndex, partial: output });
			}
			const current = output.content[activeThinkingContentIndex] as { type: "thinking"; thinking: string };
			current.thinking += text;
			stream.push({
				type: "thinking_delta",
				contentIndex: activeThinkingContentIndex,
				delta: text,
				partial: output,
			});
		};

		const closeActiveThinkingBlock = (): void => {
			if (activeThinkingContentIndex === undefined) return;
			const current = output.content[activeThinkingContentIndex] as { type: "thinking"; thinking: string };
			stream.push({
				type: "thinking_end",
				contentIndex: activeThinkingContentIndex,
				content: current.thinking,
				partial: output,
			});
			activeThinkingContentIndex = undefined;
		};

		try {
			stream.push({ type: "start", partial: output });

			await withCursorSdkNoiseSuppressed(async () => {
				const selectedModel = await toCursorModelId(model.id, options?.reasoning);
				const promptText = serializeContext(context);
				const agent = await createCursorAgent({
					apiKey: process.env.CURSOR_API_KEY,
					model: { id: selectedModel } as ModelSelection,
						// YOLO-style local runtime: load all Cursor settings and disable sandbox
						// so the agent can execute tool/shell flows without interactive gating.
						local: {
							cwd: process.cwd(),
							settingSources: ["all"],
							sandboxOptions: { enabled: false },
						},
				});

				try {
					options?.signal?.addEventListener("abort", onAbort, { once: true });
					// Keep force=true so stale/busy local runs never block autonomous execution.
					const run = await agent.send(promptText, { local: { force: true } });
					runCancel = () => run.cancel();

					for await (const event of run.stream()) {
						if (aborted) break;
						if (event.type === "tool_call") {
							if (event.status !== "running" && event.status !== "completed" && event.status !== "error") {
								continue;
							}
							const mapped = mapCursorTool(event.name, event.args);
							if (!mapped) continue;

							if (!emittedToolCallIds.has(event.call_id)) {
								closeActiveThinkingBlock();
								closeActiveTextBlock();
								emittedToolCallIds.add(event.call_id);
								emitToolCallBlock(output, mapped, event.call_id);
								sawPiToolCall = true;
							}

							continue;
						}
						if (event.type === "thinking") {
							appendThinkingDelta(event.text || "");
							continue;
						}
						if (event.type !== "assistant") continue;
						closeActiveThinkingBlock();

						for (const block of event.message.content) {
							if (block.type === "thinking" && typeof block.thinking === "string") {
								appendThinkingDelta(block.thinking);
								continue;
							}

							if (block.type === "reasoning" && typeof block.text === "string") {
								appendThinkingDelta(block.text);
								continue;
							}

							if (block.type === "text") {
								const text = block.text || "";
								const extracted = extractThinkingTextFromTranscript(text);
								if (extracted.thinking) {
									appendThinkingDelta(extracted.thinking);
								}
								const visibleText = extracted.remainingText;
								if (!visibleText.trim()) {
									continue;
								}
								appendTextDelta(visibleText);
								continue;
							}

							if (block.type === "tool_use") {
								const mapped = mapCursorTool(block.name, block.input);
								if (!mapped) continue;
								closeActiveThinkingBlock();
								closeActiveTextBlock();
								const toolCallId = block.id || `call_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
								if (emittedToolCallIds.has(toolCallId)) {
									continue;
								}
								emittedToolCallIds.add(toolCallId);
								emitToolCallBlock(output, mapped, toolCallId);
								sawPiToolCall = true;
							}
						}
					}
					closeActiveThinkingBlock();
					closeActiveTextBlock();

					const result = await run.wait();
					if (aborted || options?.signal?.aborted || result.status === "cancelled") {
						output.stopReason = "aborted";
						output.errorMessage = "Request aborted";
						stream.push({ type: "error", reason: "aborted", error: output });
						stream.end();
						return;
					}
					if (result.status !== "finished") {
						output.stopReason = "error";
						output.errorMessage = result.result || `Cursor SDK run status: ${result.status}`;
						stream.push({ type: "error", reason: "error", error: output });
						stream.end();
						return;
					}

					applyUsage(model, output, promptText, plainText || result.result || "");

					// Some models may output fenced `pi_tool_call` JSON as plain text instead of native tool blocks.
					// Convert it into a real toolCall block so Pi UI/tool execution works consistently.
					if (!sawPiToolCall) {
						const parsedPiToolCalls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
						const parsedFenced = parsePiToolCall(plainText, context);
						if (parsedFenced) parsedPiToolCalls.push(parsedFenced);
						const parsedBracket = parseBracketToolCall(plainText, context);
						if (parsedBracket) parsedPiToolCalls.push(parsedBracket);
						parsedPiToolCalls.push(...parseCursorTranscriptToolCalls(plainText, context));

						if (parsedPiToolCalls.length > 0) {
							closeActiveTextBlock();
							closeActiveThinkingBlock();
							for (const parsedPiToolCall of parsedPiToolCalls) {
							const contentIndex = output.content.length;
							const toolCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
							const normalizedArgs = normalizeParsedToolCallArgs(
								parsedPiToolCall.name,
								parsedPiToolCall.arguments,
							);
							const piToolCall = {
								type: "toolCall" as const,
								id: toolCallId,
								name: parsedPiToolCall.name,
								arguments: normalizedArgs,
							};
							output.content.push(piToolCall);
							stream.push({ type: "toolcall_start", contentIndex, partial: output });
							stream.push({
								type: "toolcall_delta",
								contentIndex,
								delta: JSON.stringify(normalizedArgs),
								partial: output,
							});
							stream.push({ type: "toolcall_end", contentIndex, toolCall: piToolCall, partial: output });
							sawPiToolCall = true;
							}

							const cleaned = stripToolCallMarkup(plainText);
							if (cleaned !== plainText) {
								for (const content of output.content) {
									if (content.type === "text") {
										content.text = stripToolCallMarkup(content.text);
									}
								}
							}
						}
					}

					if (sawPiToolCall) {
						for (const content of output.content) {
							if (content.type === "text") {
								content.text = stripToolCallMarkup(content.text);
							}
						}
						output.stopReason = "toolUse";
						stream.push({ type: "done", reason: "toolUse", message: output });
					} else {
						stream.push({ type: "done", reason: "stop", message: output });
					}
					stream.end();
				} finally {
					options?.signal?.removeEventListener("abort", onAbort);
					agent.close();
				}
			});
		} catch (error) {
			output.stopReason = options?.signal?.aborted ? "aborted" : "error";
			output.errorMessage = error instanceof Error ? error.message : String(error);
			stream.push({ type: "error", reason: output.stopReason, error: output });
			stream.end();
		}
	})();

	return stream;
}

export const __streamCursorSdkForTests = streamCursorSdk;

export default function cursorSdkProvider(pi: ExtensionAPI) {
	// Synchronous fallback registration; refreshed with account-specific models below.
	registerCursorProviderModels(pi, PROVIDER_MODELS);

	const refreshProviderModels = async (forceRefresh = false) => {
		const models = await getDynamicProviderModels(forceRefresh);
		registerCursorProviderModels(pi, models);
	};

	void refreshProviderModels();

	pi.on("session_start", () => {
		void refreshProviderModels(true);
	});
}
