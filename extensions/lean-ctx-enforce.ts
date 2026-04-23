import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const GUARDED_TOOLS = new Set(["read", "write", "edit", "grep", "find", "ls", "bash"]);
const CACHE_TTL_MS = 10_000;

type LeanCtxState = {
  checkedAt: number;
  available: boolean;
  bin?: string;
};

type SystemPromptCache = {
  path: string;
  mtimeMs: number;
  text: string;
};

let cachedLeanCtx: LeanCtxState = {
  checkedAt: 0,
  available: false,
};

let cachedSystemPrompt: SystemPromptCache | undefined;

async function detectLeanCtx(pi: ExtensionAPI): Promise<LeanCtxState> {
  const now = Date.now();
  if (now - cachedLeanCtx.checkedAt < CACHE_TTL_MS) return cachedLeanCtx;

  try {
    const result = await pi.exec(
      "bash",
      [
        "-lc",
        'if command -v lean-ctx >/dev/null 2>&1; then command -v lean-ctx; elif [ -x "$HOME/.local/bin/lean-ctx" ]; then echo "$HOME/.local/bin/lean-ctx"; else exit 1; fi',
      ],
      { timeout: 2000 },
    );

    cachedLeanCtx = {
      checkedAt: now,
      available: result.code === 0,
      bin: result.code === 0 ? result.stdout.trim().split("\n")[0] : undefined,
    };
  } catch {
    cachedLeanCtx = { checkedAt: now, available: false };
  }

  return cachedLeanCtx;
}

function bashUsesLeanCtx(command: string): boolean {
  const trimmed = command.trim();
  if (!trimmed) return false;
  return /(^|\s|&&|\|\|)lean-ctx(\s|$)/.test(trimmed);
}

async function loadProjectSystemPrompt(cwd: string): Promise<string | undefined> {
  const path = resolve(cwd, ".pi", "SYSTEM.md");

  try {
    const info = await stat(path);
    if (cachedSystemPrompt && cachedSystemPrompt.path === path && cachedSystemPrompt.mtimeMs === info.mtimeMs) {
      return cachedSystemPrompt.text;
    }

    const text = await readFile(path, "utf8");
    const trimmed = text.trim();
    if (!trimmed) return undefined;

    cachedSystemPrompt = {
      path,
      mtimeMs: info.mtimeMs,
      text: trimmed,
    };
    return trimmed;
  } catch {
    return undefined;
  }
}

function pickVerificationMarker(promptText: string): string | undefined {
  for (const line of promptText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("- ")) continue;
    if (trimmed.length < 12) continue;
    return trimmed.slice(0, 120);
  }
  return undefined;
}

async function reportSystemPromptStatus(ctx: ExtensionContext): Promise<"missing" | "verified" | "uncertain"> {
  const projectPrompt = await loadProjectSystemPrompt(ctx.cwd);
  if (!projectPrompt) {
    ctx.ui.notify(".pi/SYSTEM.md not found. Pi default system prompt active.", "warning");
    return "missing";
  }

  const effectivePrompt = ctx.getSystemPrompt();
  const marker = pickVerificationMarker(projectPrompt);
  if (marker && effectivePrompt.includes(marker)) {
    ctx.ui.notify(".pi/SYSTEM.md detected and present in effective system prompt.", "success");
    return "verified";
  }

  ctx.ui.notify(".pi/SYSTEM.md found. Verification uncertain; reload and re-check.", "info");
  return "uncertain";
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    const state = await detectLeanCtx(pi);
    if (state.available) {
      ctx.ui.notify(`lean-ctx enforcement active (${state.bin ?? "lean-ctx"})`, "info");
    } else {
      ctx.ui.notify("lean-ctx not found. Built-in tools allowed until installed.", "warning");
    }

    await reportSystemPromptStatus(ctx);
  });

  pi.registerCommand("lean-ctx-status", {
    description: "Show lean-ctx enforcement status",
    handler: async (_args, ctx) => {
      cachedLeanCtx.checkedAt = 0;
      const state = await detectLeanCtx(pi);
      if (state.available) {
        ctx.ui.notify(`lean-ctx available: ${state.bin ?? "lean-ctx"}. Built-ins blocked.`, "success");
      } else {
        ctx.ui.notify("lean-ctx unavailable. Built-ins currently allowed.", "warning");
      }
    },
  });

  pi.registerCommand("system-prompt-status", {
    description: "Check .pi/SYSTEM.md replacement status",
    handler: async (_args, ctx) => {
      await reportSystemPromptStatus(ctx);
    },
  });

  pi.on("tool_call", async (event) => {
    if (!GUARDED_TOOLS.has(event.toolName)) return;

    const state = await detectLeanCtx(pi);
    if (!state.available) return;

    if (event.toolName === "bash") {
      const command = String((event.input as { command?: unknown })?.command ?? "");
      if (bashUsesLeanCtx(command)) return;

      return {
        block: true,
        reason: "Blocked by lean-ctx enforcement. Use `lean-ctx -c <command>` for shell commands.",
      };
    }

    return {
      block: true,
      reason: `Blocked by lean-ctx enforcement. Use lean-ctx tools/flows instead of built-in \`${event.toolName}\`.`,
    };
  });
}
