/**
 * ck-enforce — intercepts grep tool calls and steers model to ck.
 *
 * Layer 2 of semantic search enforcement:
 *   Overrides lean-ctx's `grep` tool on session_start.
 *   Conceptual queries (multi-word, no regex) → BLOCKED with error
 *     steering model to use ck --hybrid directly.
 *   Literal/exact queries → native ripgrep via lean-ctx.
 *
 * Config (env vars):
 *   CK_ENFORCE_DISABLE  — "true" to disable interception
 *   CK_ENFORCE_LOG      — "true" to log reroutes to stderr
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import {
  existsSync,
} from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { homedir } from "node:os";

// ── Config ──────────────────────────────────────────────────────

const DISABLED = process.env.CK_ENFORCE_DISABLE === "true";
const LOG_REROUTES = process.env.CK_ENFORCE_LOG === "true";

// ── Helpers ────────────────────────────────────────────────────

function shellQuote(value: string): string {
  if (!value) return "''";
  if (/^[A-Za-z0-9_./=:@,+%^-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function findBinary(name: string): string | null {
  try {
    return execSync(`which ${name}`, { encoding: "utf8", timeout: 5_000 }).trim() || null;
  } catch {
    return null;
  }
}

function resolveLeanCtx(): string {
  const home = homedir();
  const candidates = [
    resolve(home, ".cargo", "bin", "lean-ctx"),
    resolve(home, ".local", "bin", "lean-ctx"),
    "/usr/local/bin/lean-ctx",
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return "lean-ctx";
}

// ── Heuristic ──────────────────────────────────────────────────

const REGEX_CHARS = /[\^\$\.\*\[\]\\|()+{}]/;

function isConceptualPattern(pattern: string): boolean {
  if (REGEX_CHARS.test(pattern)) return false;
  if (pattern.includes(" ")) return true;
  return false;
}

// ── grep schema ────────────────────────────────────────────────

const grepSchema = Type.Object({
  pattern: Type.String({ description: "Search pattern (regex or literal string)" }),
  path: Type.Optional(
    Type.String({ description: "Directory or file to search (default: current directory)" }),
  ),
  glob: Type.Optional(
    Type.String({ description: "Filter files by glob pattern, e.g. '*.ts'" }),
  ),
  ignoreCase: Type.Optional(
    Type.Boolean({ description: "Case-insensitive search (default: false)" }),
  ),
  literal: Type.Optional(
    Type.Boolean({ description: "Treat pattern as literal string (default: false)" }),
  ),
  context: Type.Optional(
    Type.Number({ description: "Lines of context around each match (default: 0)" }),
  ),
  limit: Type.Optional(
    Type.Number({ description: "Maximum number of matches (default: 100)" }),
  ),
});

// ── Extension ──────────────────────────────────────────────────

export default async function ckEnforce(pi: ExtensionAPI) {
  const ckPath = findBinary("ck");
  if (!ckPath) {
    console.log("[ck-enforce] ck not found in PATH — interception disabled");
    return;
  }

  if (DISABLED) {
    console.log("[ck-enforce] Disabled via CK_ENFORCE_DISABLE=true");
    return;
  }

  const leanCtxBin = resolveLeanCtx();
  let grepRegistered = false;

  // Status command
  pi.registerCommand("ck-enforce", {
    description: "Show ck-enforce status: ck path, grep interception",
    handler: async (_args, ctx) => {
      const lines = [
        "ck-enforce status:",
        `  ck: ${ckPath}`,
        `  lean-ctx: ${leanCtxBin}`,
        `  grep interception: ${DISABLED ? "disabled" : "enabled"}`,
        `  grep registered: ${grepRegistered ? "yes" : "no (not yet)"}`,
        `  logging: ${LOG_REROUTES ? "on" : "off"}`,
        "",
        "Blocking heuristic:",
        "  Multi-word + no regex chars → BLOCKED (use ck --hybrid)",
        "  Single word / regex / literal=true / glob → native rg",
      ];
      ctx.ui.notify(lines.join("\n"), "info");
    },
  });

  // Register grep override on session_start
  pi.on("session_start", () => {
    if (grepRegistered) return;
    grepRegistered = true;

    pi.registerTool({
      name: "grep",
      label: "grep",
      description:
        "Search file contents. For exact/literal/regex patterns, uses ripgrep. " +
        "Multi-word/conceptual queries are BLOCKED — use ck --hybrid instead. " +
        "Use limit to cap matches and context for surrounding lines.",
      promptSnippet: "Search file contents for patterns",
      parameters: grepSchema,
      async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
        const requestedPath = params.path || ".";
        const absolutePath = resolve(ctx.cwd, requestedPath);
        const limit = params.limit || 100;
        const pattern = params.pattern;

        const useCk =
          !params.literal &&
          !params.glob &&
          !params.context &&
          isConceptualPattern(pattern);

        if (useCk) {
          if (LOG_REROUTES) {
            console.error(`[ck-enforce] BLOCKED: grep "${pattern}" → steer to ck`);
          }

          const suggestPath = requestedPath !== "." ? ` ${shellQuote(requestedPath)}` : " .";
          const suggestLimit = limit !== 100 ? ` --limit ${limit}` : "";
          const msg = [
            `⛔ grep BLOCKED for multi-word/conceptual query: "${pattern}"`,
            ``,
            `Use ck instead — grep is for exact literal matches only.`,
            ``,
            `Suggested command:`,
            `  ck --hybrid "${pattern}"${suggestPath}${suggestLimit}`,
            ``,
            `Options:`,
            `  ck --hybrid "query" path/           # semantic + lexical (default)`,
            `  ck --sem "concept" src/              # purely semantic`,
            `  ck --lex "exact" .                   # purely lexical`,
            `  grep pattern path/ --literal true    # only for exact string matches`,
          ].join("\n");

          throw new Error(msg);
        }

        // Native rg via lean-ctx
        const rgArgs = ["rg", "--line-number", "--color=never"];
        if (params.ignoreCase) rgArgs.push("-i");
        if (params.literal) rgArgs.push("-F");
        if (params.context && params.context > 0) rgArgs.push(`-C${params.context}`);
        if (params.glob) rgArgs.push("--glob", params.glob);
        if (limit > 0) rgArgs.push("-m", String(limit));
        rgArgs.push(pattern, absolutePath);

        try {
          // pi.exec doesn't type-check env, but lean-ctx uses it at runtime
          const execOpts = { env: { ...process.env, LEAN_CTX_COMPRESS: "1" } } as Record<string, unknown>;
          const result = await pi.exec(leanCtxBin, ["-c", ...rgArgs], execOpts as Parameters<typeof pi.exec>[2]);

          if (result.code === 1) {
            return {
              content: [{ type: "text", text: "" }],
              details: { path: absolutePath, pattern, source: "lean-ctx-rg", rerouted: false },
            };
          }

          if (result.code !== 0) {
            throw new Error((result.stderr || result.stdout || "").trim());
          }

          return {
            content: [{ type: "text", text: result.stdout }],
            details: { path: absolutePath, pattern, source: "lean-ctx-rg", rerouted: false },
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`grep failed: ${msg}`);
        }
      },
    });
  });
}
