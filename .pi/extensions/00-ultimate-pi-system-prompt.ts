/**
 * System prompt for ultimate-pi end users:
 * 1. Workspace override: `cwd/.pi/system.md` (lowercase)
 * 2. Package default: `<ultimate-pi>/.pi/SYSTEM.md` (via package root resolution)
 *
 * Does not copy or seed workspace files. Uses `before_agent_start` →
 * `systemPrompt` replacement (runs early via `00-` prefix so harness extensions
 * can still append).
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type {
	BuildSystemPromptOptions,
	ExtensionAPI,
} from "@mariozechner/pi-coding-agent";
import { formatSkillsForPrompt } from "@mariozechner/pi-coding-agent";
import { resolveHarnessAsset } from "./lib/harness-paths.js";

// @ts-expect-error pi extensions run as ESM
const MODULE_URL = import.meta.url;

/** Workspace override path (lowercase only — not Pi's SYSTEM.md discovery). */
const WORKSPACE_SYSTEM_MD = join(".pi", "system.md");

/** Mirror Pi `buildSystemPrompt` customPrompt branch (see system-prompt.js). */
function buildFromCustomPrompt(
	customPrompt: string,
	options: BuildSystemPromptOptions,
): string {
	const {
		appendSystemPrompt,
		cwd,
		contextFiles: providedContextFiles,
		skills: providedSkills,
		selectedTools,
	} = options;
	const promptCwd = cwd.replace(/\\/g, "/");
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const date = `${year}-${month}-${day}`;
	const appendSection = appendSystemPrompt ? `\n\n${appendSystemPrompt}` : "";
	const contextFiles = providedContextFiles ?? [];
	const skills = providedSkills ?? [];
	let prompt = customPrompt;
	if (appendSection) {
		prompt += appendSection;
	}
	if (contextFiles.length > 0) {
		prompt += "\n\n# Project Context\n\n";
		prompt += "Project-specific instructions and guidelines:\n\n";
		for (const { path: filePath, content } of contextFiles) {
			prompt += `## ${filePath}\n\n${content}\n\n`;
		}
	}
	const customPromptHasRead = !selectedTools || selectedTools.includes("read");
	if (customPromptHasRead && skills.length > 0) {
		prompt += formatSkillsForPrompt(skills);
	}
	prompt += `\nCurrent date: ${date}`;
	prompt += `\nCurrent working directory: ${promptCwd}`;
	return prompt;
}

function isDisabled(): boolean {
	const raw = process.env.ULTIMATE_PI_SYSTEM_PROMPT?.trim().toLowerCase();
	return raw === "0" || raw === "false" || raw === "off" || raw === "no";
}

function workspaceSystemPromptPath(cwd: string): string {
	return join(cwd, WORKSPACE_SYSTEM_MD);
}

function packageSystemPromptPath(): string {
	return resolveHarnessAsset(MODULE_URL, ".pi", "SYSTEM.md");
}

type PromptSource = "workspace" | "package";

function resolveSystemPromptPath(cwd: string): {
	path: string;
	source: PromptSource;
} | null {
	const workspacePath = workspaceSystemPromptPath(cwd);
	if (existsSync(workspacePath)) {
		return { path: workspacePath, source: "workspace" };
	}
	const packagePath = packageSystemPromptPath();
	if (existsSync(packagePath)) {
		return { path: packagePath, source: "package" };
	}
	return null;
}

interface PromptCache {
	path: string;
	source: PromptSource;
	mtimeMs: number;
	content: string;
}

function readPromptFile(path: string): string | null {
	try {
		const content = readFileSync(path, "utf-8").trim();
		return content.length > 0 ? content : null;
	} catch {
		return null;
	}
}

export default function ultimatePiSystemPrompt(pi: ExtensionAPI) {
	if (isDisabled()) {
		return;
	}

	let cache: PromptCache | null = null;
	let warnedMissing = false;

	const loadSystemPrompt = (
		cwd: string,
	): { content: string; path: string; source: PromptSource } | null => {
		const resolved = resolveSystemPromptPath(cwd);
		if (!resolved) {
			return null;
		}
		try {
			const { mtimeMs } = statSync(resolved.path);
			if (
				cache &&
				cache.path === resolved.path &&
				cache.source === resolved.source &&
				cache.mtimeMs === mtimeMs
			) {
				return {
					content: cache.content,
					path: cache.path,
					source: cache.source,
				};
			}
			const content = readPromptFile(resolved.path);
			if (!content) {
				return null;
			}
			cache = {
				path: resolved.path,
				source: resolved.source,
				mtimeMs,
				content,
			};
			return { content, path: resolved.path, source: resolved.source };
		} catch {
			return null;
		}
	};

	const invalidateCache = () => {
		cache = null;
		warnedMissing = false;
	};

	pi.on("session_start", () => {
		invalidateCache();
	});

	pi.on("before_agent_start", async (event, ctx) => {
		const cwd = ctx.cwd ?? process.cwd();
		const loaded = loadSystemPrompt(cwd);

		if (!loaded) {
			if (!warnedMissing) {
				const workspacePath = workspaceSystemPromptPath(cwd);
				const pkgPath = packageSystemPromptPath();
				ctx.ui.notify(
					`[ultimate-pi] No system prompt found.\n` +
						`  Workspace override: ${workspacePath}\n` +
						`  Package default: ${pkgPath}\n` +
						`Using Pi default system prompt.`,
					"warning",
				);
				warnedMissing = true;
			}
			return;
		}

		return {
			systemPrompt: buildFromCustomPrompt(
				loaded.content,
				event.systemPromptOptions,
			),
		};
	});
}
