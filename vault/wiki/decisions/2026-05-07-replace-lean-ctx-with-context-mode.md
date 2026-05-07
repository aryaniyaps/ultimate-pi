---
type: decision
title: "Replace pi-lean-ctx with context-mode"
created: 2026-05-07
updated: 2026-05-07
tags:
  - decision
  - context-optimization
  - migration
status: accepted
related:
  - "[[context-mode]]"
  - "[[lean-ctx]]"
  - "[[agentic-harness-context-enforcement]]"

---
# Replace pi-lean-ctx with context-mode

## Context

ultimate-pi uses `pi-lean-ctx@3.5.1` for context compression via AST parsing, shell pattern compression, and smart read modes. User requested migration to `context-mode` (11K+ GitHub stars, 48K npm downloads/month) as the primary context optimization layer.

context-mode uses intercept-and-sandbox architecture: raw tool output never enters the agent's context window. Instead, output is indexed into SQLite FTS5 with BM25 ranking, and the agent queries on demand. Claims 98-99.5% token reduction. Has native Pi Coding Agent extension support with session_start, tool_call, tool_result, and session_before_compact hooks.

## Alternatives Considered

1. **Keep pi-lean-ctx** — mature, 48 MCP tools, agent governance (profiles, budgets, SLOs), Apache 2.0. Less community adoption (924 stars vs 11K).
2. **Run both simultaneously** — wiki research notes they solve complementary halves (lean-ctx: compress input, context-mode: sandbox output). However, potential tool conflicts, complexity, and user explicitly requested removal.
3. **Replace with context-mode** — stronger community validation, native Pi extension, FTS5 sandbox, "Think in Code" paradigm, session continuity.

## Chosen

Replace pi-lean-ctx with context-mode (`npm:context-mode@^1.0.111`).

## Changes Made

- `.pi/settings.json`: replaced `"npm:pi-lean-ctx"` with `"npm:context-mode"`
- `.pi/npm/package.json`: replaced `"pi-lean-ctx": "^3.5.1"` with `"context-mode": "^1.0.111"`
- `package.json`: replaced `"lean-ctx"` keyword with `"context-mode"`
- `.pi/extensions/ck-enforce.ts`: **deleted** (lean-ctx-specific grep override, no longer needed)
- `CONTRIBUTING.md`: updated lean-ctx reference to context-mode

## Tradeoffs

| Gained | Lost |
|--------|------|
| 11K+ GitHub stars, larger community | 48 MCP tools reduced to 11 |
| FTS5 sandbox (output never enters context) | AST-based compression (tree-sitter, 18 languages) |
| Native Pi extension with full hook lifecycle | 90+ shell pattern compression |
| "Think in Code" paradigm enforcement | Smart read modes (full/map/signatures) |
| Session continuity (26 events) | Agent governance (profiles, budgets, SLOs) |

## Consequences

- Need to ensure context-mode's `ctx_search` and `ctx_execute` tools are integrated into the search policy
- ck-enforce.ts was blocking conceptual grep searches and steering to `ck --hybrid` — this enforcement is lost; SYSTEM.md grep policy still applies but relies on agent compliance
- context-mode uses ELv2 license (vs Apache 2.0) — acceptable for internal use
- `npm install` in `.pi/npm/` installed 42 new packages, removed pi-lean-ctx
- Wiki pages referencing `[[lean-ctx]]` should be updated to reference `[[context-mode]]` where appropriate
