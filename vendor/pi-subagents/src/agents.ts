/**
 * Agent discovery — upstream pi-subagents + ultimate-pi harness extensions.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { getAgentDir, parseFrontmatter } from "@earendil-works/pi-coding-agent";

export type AgentScope = "user" | "project" | "both";

export type AgentSource = "built-in" | "user" | "project" | "package";

export interface AgentConfig {
	name: string;
	description: string;
	tools?: string[];
	model?: string;
	thinking?: string;
	maxTurns?: number;
	extensionsOff?: boolean;
	skillsOff?: boolean;
	systemPrompt: string;
	source: AgentSource;
	filePath: string;
}

const BUILTIN_TOOL_NAMES = [
	"read",
	"write",
	"edit",
	"bash",
	"grep",
	"find",
	"ls",
];

const BUILT_IN_AGENTS: AgentConfig[] = [
	{
		name: "scout",
		description:
			"Read-only codebase reconnaissance; returns concise findings with paths and evidence.",
		tools: ["read", "grep", "find", "ls", "bash"],
		source: "built-in",
		filePath: "built-in:scout",
		systemPrompt: [
			"You are a scout subagent. Explore the codebase quickly and report grounded findings.",
			"Do not edit files. Prefer read, grep, find, ls, and safe bash inspection commands.",
			"Return concise bullets with exact file paths, symbols, and open questions.",
		].join("\n"),
	},
	{
		name: "planner",
		description: "Turns reconnaissance into a lean implementation or migration plan.",
		tools: ["read", "grep", "find", "ls"],
		source: "built-in",
		filePath: "built-in:planner",
		systemPrompt: [
			"You are a planner subagent. Produce executable, verifiable plans only.",
			"Do not modify files. Ground the plan in the repository's actual structure.",
			"Call out assumptions, risks, sequencing, and verification commands.",
		].join("\n"),
	},
	{
		name: "reviewer",
		description: "Independent code review and verification agent for completed changes.",
		tools: ["read", "grep", "find", "ls", "bash"],
		source: "built-in",
		filePath: "built-in:reviewer",
		systemPrompt: [
			"You are a reviewer subagent. Review changes adversarially and verify claims.",
			"Do not edit files. Run safe inspection or test commands when useful.",
			"Report PASS, FAIL, or PARTIAL with evidence, commands run, and specific follow-ups.",
		].join("\n"),
	},
	{
		name: "worker",
		description: "General-purpose implementation worker with the default Pi tool set.",
		source: "built-in",
		filePath: "built-in:worker",
		systemPrompt: workerSystemPrompt(),
	},
	{
		name: "general",
		description: "Alias for worker; kept for model-generated subagent names.",
		source: "built-in",
		filePath: "built-in:general",
		systemPrompt: workerSystemPrompt(),
	},
	{
		name: "general-purpose",
		description: "Alias for worker; compatible with common subagent naming conventions.",
		source: "built-in",
		filePath: "built-in:general-purpose",
		systemPrompt: workerSystemPrompt(),
	},
];

function workerSystemPrompt(): string {
	return [
		"You are a focused worker subagent running in an isolated Pi process.",
		"Complete the delegated task directly. Keep scope tight and avoid unrelated changes.",
		"When done, summarize files changed, commands run, and any remaining risks.",
	].join("\n");
}

export interface AgentDiscoveryResult {
	agents: AgentConfig[];
	projectAgentsDir: string | null;
	packageAgentsDir: string | null;
}

export function isSafeAgentId(id: string): boolean {
	if (!id || id.includes("..") || id.startsWith("/") || id.includes("\\")) {
		return false;
	}
	return /^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/.test(id);
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

function extensionsOff(fm: Record<string, unknown>): boolean {
	const v = fm.extensions ?? fm.inherit_extensions;
	return v === false || v === "false" || v === "none";
}

function skillsOff(fm: Record<string, unknown>, extensionsDisabled: boolean): boolean {
	if (extensionsDisabled) return true;
	const v = fm.skills ?? fm.inherit_skills;
	return v === false || v === "false" || v === "none";
}

export function computeEffectiveTools(
	allowed: string[],
	disallowed: string[] | undefined,
	agentName: string,
): string[] {
	const deny = new Set(
		(disallowed ?? []).map((t) => t.trim()).filter(Boolean),
	);
	deny.add("subagent");
	deny.add("Agent");
	deny.add("get_subagent_result");
	deny.add("steer_subagent");
	deny.add("blackboard");
	if (agentName.startsWith("harness/")) {
		deny.add("subagent");
	}
	return allowed.filter((t) => !deny.has(t));
}

export function agentAllowsMutatingTools(agent: AgentConfig): boolean {
	const tools = agent.tools ?? BUILTIN_TOOL_NAMES;
	return tools.includes("write") || tools.includes("edit");
}

function walkAgentsDir(
	rootDir: string,
	source: AgentSource,
	out: Map<string, { filePath: string; content: string }>,
): void {
	if (!fs.existsSync(rootDir)) return;

	const stack: string[] = [rootDir];
	while (stack.length > 0) {
		const dir = stack.pop()!;
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			continue;
		}

		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				stack.push(full);
				continue;
			}
			if (!entry.name.endsWith(".md")) continue;
			if (!entry.isFile() && !entry.isSymbolicLink()) continue;

			const rel = path.relative(rootDir, full).replace(/\\/g, "/");
			const id = rel.replace(/\.md$/i, "");
			if (!isSafeAgentId(id)) continue;

			let content: string;
			try {
				content = fs.readFileSync(full, "utf-8");
			} catch {
				continue;
			}

			out.set(id, { filePath: full, content });
		}
	}
}

function parseMarkdownAgent(
	agentId: string,
	content: string,
	source: AgentSource,
	filePath: string,
): AgentConfig | null {
	const { frontmatter: fm, body } = parseFrontmatter<Record<string, unknown>>(
		content,
	);

	const description =
		typeof fm.description === "string" ? fm.description.trim() : "";
	if (!description) return null;

	const name =
		typeof fm.name === "string" && fm.name.trim() ? fm.name.trim() : agentId;

	const allowed = csvList(fm.tools, BUILTIN_TOOL_NAMES);
	const disallowed = parseCsvField(fm.disallowed_tools);
	const extOff = extensionsOff(fm);
	const effective = computeEffectiveTools(allowed, disallowed, name);

	let thinking: string | undefined;
	if (typeof fm.thinking === "string" && fm.thinking.trim()) {
		thinking = fm.thinking.trim();
	}

	let maxTurns: number | undefined;
	if (typeof fm.max_turns === "number" && fm.max_turns > 0) {
		maxTurns = fm.max_turns;
	}

	let systemPrompt = body.trim();
	if (maxTurns) {
		systemPrompt += `\n\nHard limit: complete within ${maxTurns} tool rounds then output your final structured answer.`;
	}

	return {
		name,
		description,
		tools: effective.length > 0 ? effective : undefined,
		model: typeof fm.model === "string" ? fm.model : undefined,
		thinking,
		maxTurns,
		extensionsOff: extOff,
		skillsOff: skillsOff(fm, extOff),
		systemPrompt,
		source,
		filePath,
	};
}

function isDirectory(p: string): boolean {
	try {
		return fs.statSync(p).isDirectory();
	} catch {
		return false;
	}
}

function findNearestProjectAgentsDir(cwd: string): string | null {
	let currentDir = cwd;
	while (true) {
		const candidate = path.join(currentDir, ".pi", "agents");
		if (isDirectory(candidate)) return candidate;

		const parentDir = path.dirname(currentDir);
		if (parentDir === currentDir) return null;
		currentDir = parentDir;
	}
}

function resolvePackageAgentsDir(
	cwd: string,
	packageRoot?: string,
): string | null {
	const fromEnv = process.env.UP_PKG ?? process.env.HARNESS_PKG_ROOT;
	const root = packageRoot ?? fromEnv;
	if (root) {
		const candidate = path.join(root, ".pi", "agents");
		if (isDirectory(candidate)) return candidate;
	}
	return null;
}

export function discoverAgents(
	cwd: string,
	scope: AgentScope,
	packageRoot?: string,
): AgentDiscoveryResult {
	const userDir = path.join(getAgentDir(), "agents");
	const projectAgentsDir = findNearestProjectAgentsDir(cwd);
	const packageAgentsDir = resolvePackageAgentsDir(cwd, packageRoot);

	const fileMap = new Map<string, { filePath: string; content: string }>();

	if (scope !== "project" && packageAgentsDir) {
		walkAgentsDir(packageAgentsDir, "package", fileMap);
	}
	if (scope !== "project") {
		walkAgentsDir(userDir, "user", fileMap);
	}
	if (scope !== "user" && projectAgentsDir) {
		walkAgentsDir(projectAgentsDir, "project", fileMap);
	}

	const agentMap = new Map<string, AgentConfig>();

	for (const agent of BUILT_IN_AGENTS) {
		agentMap.set(agent.name, { ...agent });
	}

	for (const [id, file] of fileMap) {
		const source: AgentSource =
			file.filePath.includes("/.pi/agents") &&
			packageAgentsDir &&
			file.filePath.startsWith(packageAgentsDir)
				? "package"
				: file.filePath.includes(projectAgentsDir ?? "\0")
					? "project"
					: "user";
		const parsed = parseMarkdownAgent(id, file.content, source, file.filePath);
		if (parsed) agentMap.set(parsed.name, parsed);
	}

	return {
		agents: Array.from(agentMap.values()),
		projectAgentsDir,
		packageAgentsDir,
	};
}

export function formatAgentList(
	agents: AgentConfig[],
	maxItems: number,
): { text: string; remaining: number } {
	if (agents.length === 0) return { text: "none", remaining: 0 };
	const listed = agents.slice(0, maxItems);
	const remaining = agents.length - listed.length;
	return {
		text: listed
			.map((a) => `${a.name} (${a.source}): ${a.description}`)
			.join("; "),
		remaining,
	};
}
