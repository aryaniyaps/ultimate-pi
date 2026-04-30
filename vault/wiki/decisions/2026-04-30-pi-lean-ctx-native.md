---
type: decision
status: accepted
created: 2026-04-30
tags:
  - lean-ctx
  - pi
  - extensions
  - token-optimization
  - mcp
related:
  - "[[lean-ctx]]"
  - "[[leanctx-website]]"
  - "[[Research: context-mode vs lean-ctx]]"
---

# ADR: Adopt pi-lean-ctx Native Package, Drop Custom Extension

## Context

The ultimate-pi harness had a custom extension (`extensions/lean-ctx-enforce.ts`) that:

- Detected lean-ctx binary availability
- Wrapped `bash` commands with `lean-ctx -c` prefix
- Overrode `read` to call `lean-ctx read` with simple mode selection
- Registered `/lean-ctx-status` diagnostic command

This custom extension was a stopgap — basic, manual wrapping, no MCP bridge, no auto mode selection, no compression stats.

Meanwhile, the pi-lean-ctx npm package (v3.4.5, published by yvgude) provides a native Pi extension with full lean-ctx integration.

## Alternatives Considered

1. **Keep custom extension** — Simple, self-contained, no external npm dependency. But misses MCP bridge (48 tools), auto read-mode selection, ls/find/grep tools, compression stats, and reconnection logic.

2. **Adopt pi-lean-ctx** — npm package maintained by lean-ctx author. Full MCP integration, all 48 lean-ctx MCP tools as native Pi tools, rich read mode selection, spawnHook bash wrapping, compression stats footer, reconnect/timeout-handling.

3. **Hybrid: keep custom + add MCP manually** — Would duplicate effort. pi-lean-ctx already does everything better.

## Decision

**Replace the custom `lean-ctx-enforce.ts` extension with the `pi-lean-ctx` npm package.**

## Changes Made

| File | Action | Detail |
|------|--------|--------|
| `extensions/lean-ctx-enforce.ts` | Deleted | Replaced by pi-lean-ctx |
| `.pi/settings.json` | Edited | Added `"npm:pi-lean-ctx"` to packages array |
| `.pi/SYSTEM.md` | Edited | Updated skill routing line |
| `package.json` | Edited | Updated `check:ts` script to dotenv-loader |
| `.pi/skills/lean-ctx/SKILL.md` | Edited | Added integration note at top |
| `.pi/npm/node_modules/pi-lean-ctx` | Installed | v3.4.5 + all deps |

## What pi-lean-ctx Provides

### Tool Overrides

| Tool | Custom Ext | pi-lean-ctx |
|------|-----------|-------------|
| `bash` | Prepends `lean-ctx -c` | SpawnHook wraps `lean-ctx -c sh -lc` (preserves env, aliases). `raw=true` bypass option. |
| `read` | Basic `lean-ctx read -m lines/…` | Auto mode selection: full (<8KB code), map (8KB–96KB), signatures (>96KB). Syntax highlighting. Compression stats footer. Truncation handling. |
| `ls` | Not handled | Routes through `lean-ctx ls` with limit support |
| `find` | Not handled | Routes through `lean-ctx find` with glob + limit |
| `grep` | Not handled | Routes through `lean-ctx -c rg` with full ripgrep flags |
| `cat` blocking | Not enforced | Read tool description warns: "Do NOT use bash to read files (cat/head/tail)" |

### MCP Bridge

- Auto-connects to lean-ctx MCP server (stdio transport)
- Registers all 48 lean-ctx MCP tools as native Pi tools
- Auto-reconnect (3 attempts, exponential backoff 2s/4s/8s)
- 120s tool timeout with retry for idempotent tools
- Tools excluded from bridge: `ctx_read`, `ctx_multi_read`, `ctx_shell`, `ctx_search`, `ctx_tree` (already handled via Pi-native tools)

### Diagnostic Command

`/lean-ctx` — Shows binary path, MCP bridge status, registered tool count, reconnect attempts, last hung/errored tool.

## Dependencies

- **Runtime**: `lean-ctx` binary (v3.4.2 installed via npm/cargo)
- **npm**: `pi-lean-ctx@3.4.5` with `@modelcontextprotocol/sdk@^1.29.0`
- **Peer**: `@mariozechner/pi-coding-agent@>=0.50.0` (we have 0.70.x)
- **Peer**: `@mariozechner/pi-tui@*` (available via pi-coding-agent)
- **TypeBox alias**: pi-agent's jiti loader aliases `@sinclair/typebox` → `typebox`

## Consequences

### Positive

- 48 lean-ctx MCP tools available to agent: `ctx_session`, `ctx_knowledge`, `ctx_semantic_search`, `ctx_impact`, `ctx_architecture`, `ctx_workflow`, `ctx_gain`, etc.
- Richer read modes: auto mode selection based on file size + extension
- Proper compression stats on every tool output
- Graceful reconnection if MCP server dies
- Upstream-maintained (by lean-ctx author yvgude)

### Negative

- External npm dependency (mitigated: published by same author as lean-ctx, Apache 2.0)
- MCP bridge adds startup latency (~200ms for tool discovery)
- One more package to keep updated

### Neutral

- `/lean-ctx-status` command removed; replaced by `/lean-ctx`
- Skill routing in SYSTEM.md changed from "default layer" to "native Pi package" description

## Verification

- `lean-ctx` binary v3.4.2 installed ✓
- `pi-lean-ctx` v3.4.5 installed in `.pi/npm/node_modules` ✓
- All peer dependencies satisfied ✓
- `tsc` check on remaining extensions passes ✓
- @sinclair/typebox aliased by jiti loader ✓

## Next

- Restart pi agent; pi-lean-ctx loads at session start
- Run `/lean-ctx` to verify MCP bridge connected
- Monitor `lean-ctx gain` after a few sessions for token savings data
