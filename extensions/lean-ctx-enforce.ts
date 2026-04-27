import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createBashTool, createReadTool } from "@mariozechner/pi-coding-agent";

const CACHE_TTL_MS = 10_000;

type LeanCtxState = {
  checkedAt: number;
  available: boolean;
  bin?: string;
};

let cachedLeanCtx: LeanCtxState = {
  checkedAt: 0,
  available: false,
};

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

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    const state = await detectLeanCtx(pi);
    if (state.available) {
      ctx.ui.notify(`lean-ctx overrides active (${state.bin ?? "lean-ctx"}). Built-in tools replaced.`, "info");
    } else {
      ctx.ui.notify("lean-ctx not found. Default tools allowed until installed.", "warning");
    }

  });

  pi.registerCommand("lean-ctx-status", {
    description: "Show lean-ctx enforcement status",
    handler: async (_args, ctx) => {
      cachedLeanCtx.checkedAt = 0;
      const state = await detectLeanCtx(pi);
      if (state.available) {
        ctx.ui.notify(`lean-ctx available: ${state.bin ?? "lean-ctx"}. Built-in tools are overridden.`, "info");
      } else {
        ctx.ui.notify("lean-ctx unavailable. Built-in tools act normally.", "warning");
      }
    },
  });


  const cwd = process.cwd();

  // Override read to use lean-ctx
  const originalRead = createReadTool(cwd);
  pi.registerTool({
    name: "read",
    label: "read",
    description: "Read the contents of a file. Uses lean-ctx under the hood for efficient reading.",
    parameters: originalRead.parameters,

    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const state = await detectLeanCtx(pi);
      if (!state.available) {
        return originalRead.execute(toolCallId, params, signal, onUpdate);
      }

      const { path, offset, limit } = params;
      let mode = "full";
      if (offset !== undefined && limit !== undefined) {
        mode = `lines:${offset}-${offset + limit - 1}`;
      } else if (offset !== undefined) {
        mode = `lines:${offset}-`;
      } else if (limit !== undefined) {
        mode = `lines:1-${limit}`;
      }

      try {
        const result = await pi.exec("lean-ctx", ["read", String(path), "-m", mode], { cwd: ctx.cwd });
        if (result.code !== 0) {
            return {
                content: [{ type: "text", text: result.stderr || result.stdout || "Error reading file" }],
                details: { error: true },
            };
        }
        return {
            content: [{ type: "text", text: result.stdout }],
            details: { lines: result.stdout.split("\n").length, readViaLeanCtx: true },
        };
      } catch (error: any) {
        return {
            content: [{ type: "text", text: error.stdout || error.stderr || error.message }],
            details: { error: true },
        };
      }
    },
  });

  // Override bash to use lean-ctx automatically
  const originalBash = createBashTool(cwd);
  pi.registerTool({
    name: "bash",
    label: "bash",
    description: "Execute a bash command. Automatically wraps commands with lean-ctx for efficient output.",
    parameters: originalBash.parameters,

    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const state = await detectLeanCtx(pi);
      let command = String(params.command || "");

      if (state.available && !bashUsesLeanCtx(command)) {
        const escapedCommand = `'${command.replace(/'/g, "'\\''")}'`;
        command = `lean-ctx -c ${escapedCommand}`;
      }

      return originalBash.execute(toolCallId, { ...params, command }, signal, onUpdate);
    },
  });
}
