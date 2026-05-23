/**
 * Harness policy for context-mode execute tools (ctx_execute, ctx_batch_execute,
 * ctx_execute_file). Mirrors bash/write phase rules so agents cannot bypass
 * policy-gate via the MCP sandbox.
 */

import type { HarnessPhase } from "./harness-run-context.js";

/** Union of policy-gate and harness-subagent bash mutation patterns. */
export const BASH_MUTATION_PATTERNS: RegExp[] = [
	/\bgit\s+(add|commit|push|merge|rebase|reset|checkout|cherry-pick|apply)\b/i,
	/\brm\s+(-rf?|--recursive|-)/i,
	/\bmv\b/i,
	/\bcp\b/i,
	/\bmkdir\b/i,
	/\btouch\b/i,
	/\btee\b/i,
	/\bchmod\b/i,
	/\bchown\b/i,
	/\bsed\s+-i\b/i,
	/\bperl\s+-i\b/i,
	/\bnpm\s+(install|uninstall|ci)\b/i,
	/\bpnpm\s+(add|install|remove)\b/i,
	/\byarn\s+(add|install|remove)\b/i,
];

const CONTEXT_MODE_MUTATION_TOOLS = new Set([
	"ctx_execute",
	"ctx_batch_execute",
	"ctx_execute_file",
]);

const JS_TS_FS_MUTATION_PATTERNS: RegExp[] = [
	/\bwriteFile(?:Sync)?\s*\(/,
	/\bappendFile(?:Sync)?\s*\(/,
	/\bunlink(?:Sync)?\s*\(/,
	/\brename(?:Sync)?\s*\(/,
	/\bcopyFile(?:Sync)?\s*\(/,
	/\bmkdir(?:Sync)?\s*\(/,
	/\brm(?:Sync)?\s*\(/,
	/\brmdir(?:Sync)?\s*\(/,
	/\btruncate(?:Sync)?\s*\(/,
	/\bcreateWriteStream\s*\(/,
];

const JS_TS_SHELL_ESCAPE_PATTERNS: RegExp[] = [
	/\bexec(?:Sync)?\s*\(\s*[`'"]([^`'"]*)[`'"]/g,
	/\bspawn(?:Sync)?\s*\(\s*[`'"]([^`'"]*)[`'"]/g,
];

const PYTHON_SHELL_ESCAPE_PATTERNS: RegExp[] = [
	/\bos\.system\s*\(\s*['"]([^'"]*)['"]\s*\)/g,
	/\bsubprocess\.(?:run|call|Popen)\s*\(\s*['"]([^'"]*)['"]/g,
];

export function normalizeContextModeToolName(toolName: string): string | null {
	const raw = toolName.trim();
	if (CONTEXT_MODE_MUTATION_TOOLS.has(raw)) return raw;
	const prefixed = raw.replace(/^context_mode_/, "");
	if (CONTEXT_MODE_MUTATION_TOOLS.has(prefixed)) return prefixed;
	return null;
}

export function isMutatingBash(command: string): boolean {
	return BASH_MUTATION_PATTERNS.some((pattern) => pattern.test(command));
}

/** Split shell on &&, ||, ;, | while respecting quotes (mirrors context-mode security). */
export function splitChainedCommands(command: string): string[] {
	const parts: string[] = [];
	let current = "";
	let inSingle = false;
	let inDouble = false;
	let inBacktick = false;

	for (let i = 0; i < command.length; i++) {
		const ch = command[i];
		const prev = i > 0 ? command[i - 1] : "";

		if (ch === "'" && !inDouble && !inBacktick && prev !== "\\") {
			inSingle = !inSingle;
			current += ch;
		} else if (ch === '"' && !inSingle && !inBacktick && prev !== "\\") {
			inDouble = !inDouble;
			current += ch;
		} else if (ch === "`" && !inSingle && !inDouble && prev !== "\\") {
			inBacktick = !inBacktick;
			current += ch;
		} else if (!inSingle && !inDouble && !inBacktick) {
			if (ch === ";") {
				parts.push(current.trim());
				current = "";
			} else if (ch === "|" && command[i + 1] === "|") {
				parts.push(current.trim());
				current = "";
				i++;
			} else if (ch === "&" && command[i + 1] === "&") {
				parts.push(current.trim());
				current = "";
				i++;
			} else if (ch === "|") {
				parts.push(current.trim());
				current = "";
			} else {
				current += ch;
			}
		} else {
			current += ch;
		}
	}

	if (current.trim()) parts.push(current.trim());
	return parts.length > 0 ? parts : [command.trim()];
}

export function isMutatingShellScript(script: string): boolean {
	return splitChainedCommands(script).some((segment) =>
		isMutatingBash(segment),
	);
}

function extractRegexCommands(code: string, patterns: RegExp[]): string[] {
	const commands: string[] = [];
	for (const pattern of patterns) {
		pattern.lastIndex = 0;
		let match = pattern.exec(code);
		while (match !== null) {
			const cmd = match[match.length - 1];
			if (cmd) commands.push(cmd);
			match = pattern.exec(code);
		}
	}
	return commands;
}

export function hasJsTsFsMutation(code: string): boolean {
	return JS_TS_FS_MUTATION_PATTERNS.some((pattern) => pattern.test(code));
}

function hasEmbeddedMutatingShell(code: string, language: string): boolean {
	const lang = language.toLowerCase();
	if (lang === "javascript" || lang === "typescript") {
		const cmds = extractRegexCommands(code, JS_TS_SHELL_ESCAPE_PATTERNS);
		return cmds.some((cmd) => isMutatingShellScript(cmd));
	}
	if (lang === "python") {
		const cmds = extractRegexCommands(code, PYTHON_SHELL_ESCAPE_PATTERNS);
		return cmds.some((cmd) => isMutatingShellScript(cmd));
	}
	return false;
}

function codeLooksMutating(language: string, code: string): boolean {
	const lang = language.toLowerCase();
	if (lang === "shell") {
		return isMutatingShellScript(code);
	}
	if (lang === "javascript" || lang === "typescript") {
		return hasJsTsFsMutation(code) || hasEmbeddedMutatingShell(code, lang);
	}
	if (lang === "python") {
		return hasEmbeddedMutatingShell(code, lang);
	}
	return hasEmbeddedMutatingShell(code, lang);
}

function ctxExecuteLooksMutating(input: Record<string, unknown>): boolean {
	const language = String(input.language ?? "javascript");
	const code = String(input.code ?? "");
	if (!code.trim()) return false;
	return codeLooksMutating(language, code);
}

function ctxBatchExecuteLooksMutating(input: Record<string, unknown>): boolean {
	const commands = input.commands;
	if (!Array.isArray(commands)) return false;
	for (const entry of commands) {
		if (typeof entry === "string" && isMutatingShellScript(entry)) return true;
		if (entry && typeof entry === "object") {
			const cmd = String((entry as { command?: string }).command ?? "");
			if (cmd && isMutatingShellScript(cmd)) return true;
		}
	}
	return false;
}

function ctxExecuteFileLooksMutating(input: Record<string, unknown>): boolean {
	const language = String(input.language ?? "javascript");
	const code = String(input.code ?? "");
	if (!code.trim()) return false;
	return codeLooksMutating(language, code);
}

export function contextModeInputLooksMutating(
	canonicalTool: string,
	input: Record<string, unknown>,
): boolean {
	switch (canonicalTool) {
		case "ctx_execute":
			return ctxExecuteLooksMutating(input);
		case "ctx_batch_execute":
			return ctxBatchExecuteLooksMutating(input);
		case "ctx_execute_file":
			return ctxExecuteFileLooksMutating(input);
		default:
			return false;
	}
}

export type ContextModePolicyDecision =
	| { blocked: false }
	| { blocked: true; reason: string };

export function evaluateContextModeMutation(
	toolName: string,
	input: Record<string, unknown>,
	phase: HarnessPhase,
	opts: {
		aborted: boolean;
		budgetBypass?: boolean;
		readOnlyAgent?: boolean;
	},
): ContextModePolicyDecision {
	const canonical = normalizeContextModeToolName(toolName);
	if (!canonical) return { blocked: false };

	if (opts.budgetBypass) return { blocked: false };

	if (!contextModeInputLooksMutating(canonical, input)) {
		return { blocked: false };
	}

	if (opts.aborted) {
		return {
			blocked: true,
			reason:
				"policy-gate: context-mode execute tool blocked because harness-abort lock is active. Attach a new approved plan first.",
		};
	}

	if (opts.readOnlyAgent) {
		return {
			blocked: true,
			reason: `policy-gate: ${canonical} mutating call blocked for read-only harness agent.`,
		};
	}

	if (phase === "execute" || phase === "merge") {
		return { blocked: false };
	}

	return {
		blocked: true,
		reason: `policy-gate: ${canonical} mutating call blocked in phase '${phase}'.`,
	};
}
