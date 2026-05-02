/**
 * Wiki Hooks Extension — ports .pi/hooks/hooks.json to Pi's native extension system.
 *
 *hooks.json (unsupported by Pi) covered:
 *  1. SessionStart  → load wiki/hot.md into context
 *  2. PostCompact   → re-load wiki/hot.md after compaction
 *  3. PostToolUse   → auto-commit wiki/ changes after write/edit tools
 *  4. Stop          → prompt to update wiki/hot.md if wiki/ files changed
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	// Hot cache injection gate — set true on session_start / session_compact,
	// consumed + reset to false inside before_agent_start.
	let needsHotCache = true;

	// ── 1. SessionStart + 2. PostCompact ──────────────────────────────

	pi.on("session_start", () => {
		needsHotCache = true;
	});

	pi.on("session_compact", () => {
		needsHotCache = true;
	});

	pi.on("before_agent_start", async (event, ctx) => {
		if (!needsHotCache) return;
		needsHotCache = false;

		const hotPath = join(ctx.cwd, "wiki", "hot.md");
		if (!existsSync(hotPath)) return;

		let content: string;
		try {
			content = await readFile(hotPath, "utf-8");
		} catch {
			return;
		}

		if (!content.trim()) return;

		return {
			systemPrompt:
				event.systemPrompt +
				"\n\n" +
				"[HOT CACHE — recent wiki context. Use silently. Do not announce reading it.]\n" +
				content +
				"\n" +
				"[/HOT CACHE]",
		};
	});

	// ── 3. PostToolUse — auto-commit wiki/ after write/edit ───────────

	pi.on("tool_result", async (_event, ctx) => {
		// Fire after any write or edit, not just wiki-targeting ones,
		// because earlier tools may have left uncommitted wiki/ changes.
		if (_event.toolName !== "write" && _event.toolName !== "edit") return;

		const gitDir = join(ctx.cwd, ".git");
		if (!existsSync(gitDir)) return;

		try {
			// Stage wiki-related directories
			await pi.exec("git", ["add", "wiki/", ".raw/", ".vault-meta/"]);

			// Commit if there is anything staged
			const { code } = await pi.exec("git", ["diff", "--cached", "--quiet"]);
			if (code !== 0) {
				const stamp = new Date()
					.toISOString()
					.replace("T", " ")
					.substring(0, 16);
				await pi.exec("git", ["commit", "-m", `wiki: auto-commit ${stamp}`]);
			}
		} catch {
			// Silently ignore — not a git repo, no changes, etc.
		}
	});

	// ── 4. Stop — prompt to update wiki/hot.md ────────────────────────

	pi.on("session_shutdown", async (_event, ctx) => {
		const gitDir = join(ctx.cwd, ".git");
		const wikiDir = join(ctx.cwd, "wiki");
		if (!existsSync(gitDir) || !existsSync(wikiDir)) return;

		try {
			const { stdout } = await pi.exec("git", ["diff", "--name-only", "HEAD"]);
			if (stdout.includes("wiki/")) {
				if (ctx.hasUI) {
					ctx.ui.notify(
						"Wiki pages were modified this session. Run /save to update wiki/hot.md.",
						"info",
					);
				}
			}
		} catch {
			// Not a git repo or other error — ignore.
		}
	});
}
