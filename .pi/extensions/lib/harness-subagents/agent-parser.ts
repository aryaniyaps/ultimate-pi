/**
 * Parse harness agent .md files into AgentConfig (path id = posix relative path).
 */

import { parseFrontmatter } from "@earendil-works/pi-coding-agent";
import { BUILTIN_TOOL_NAMES } from "./vendored/agent-types.js";
import type {
	AgentConfig,
	MemoryScope,
	ThinkingLevel,
} from "./vendored/types.js";

function str(val: unknown): string | undefined {
	return typeof val === "string" ? val : undefined;
}

function nonNegativeInt(val: unknown): number | undefined {
	return typeof val === "number" && val >= 0 ? val : undefined;
}

function parseCsvField(val: unknown): string[] | undefined {
	if (val === undefined || val === null) return undefined;
	const s = String(val).trim();
	if (!s || s === "none") return undefined;
	const items = s
		.split(",")
		.map((t) => t.trim())
		.filter(Boolean);
	return items.length > 0 ? items : undefined;
}

function csvList(val: unknown, defaults: string[]): string[] {
	if (val === undefined || val === null) return defaults;
	return parseCsvField(val) ?? [];
}

function csvListOptional(val: unknown): string[] | undefined {
	return parseCsvField(val);
}

function parseMemory(val: unknown): MemoryScope | undefined {
	if (val === "user" || val === "project" || val === "local") return val;
	return undefined;
}

function inheritField(val: unknown): true | string[] | false {
	if (val === undefined || val === null || val === true) return true;
	if (val === false || val === "none") return false;
	const items = csvList(val, []);
	return items.length > 0 ? items : false;
}

export function parseAgentMarkdown(
	agentId: string,
	content: string,
	source: "package" | "project" | "global",
): AgentConfig {
	const { frontmatter: fm, body } =
		parseFrontmatter<Record<string, unknown>>(content);

	const yamlName = str(fm.name);
	const displayName = str(fm.display_name) ?? yamlName;

	return {
		name: agentId,
		displayName,
		description: str(fm.description) ?? agentId,
		builtinToolNames: csvList(fm.tools, BUILTIN_TOOL_NAMES),
		disallowedTools: csvListOptional(fm.disallowed_tools),
		extensions: inheritField(fm.extensions ?? fm.inherit_extensions),
		skills: inheritField(fm.skills ?? fm.inherit_skills),
		model: str(fm.model),
		thinking: str(fm.thinking) as ThinkingLevel | undefined,
		maxTurns: nonNegativeInt(fm.max_turns),
		systemPrompt: body.trim(),
		promptMode: fm.prompt_mode === "append" ? "append" : "replace",
		inheritContext:
			fm.inherit_context != null ? fm.inherit_context === true : undefined,
		runInBackground:
			fm.run_in_background != null ? fm.run_in_background === true : undefined,
		isolated: fm.isolated != null ? fm.isolated === true : undefined,
		memory: parseMemory(fm.memory),
		isolation: fm.isolation === "worktree" ? "worktree" : undefined,
		enabled: fm.enabled !== false,
		source: source === "package" ? "global" : source,
	};
}
