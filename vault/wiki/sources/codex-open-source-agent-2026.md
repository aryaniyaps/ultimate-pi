---
type: source
status: ingested
source_type: open-source-repository
title: "Codex CLI — OpenAI's Open-Source Coding Agent"
author: "OpenAI"
date_published: 2026
url: "https://github.com/openai/codex"
tags: [codex, openai, agent, harness, rust, open-source]
confidence: high
key_claims:
  - "Codex is a lightweight coding agent that runs locally (CLI, IDE, Desktop App, Web)"
  - "Written in Rust (96.3%) — compiled binary, zero-dependency install"
  - "79.2K+ GitHub stars, 11.4K forks, 756 releases, open-source Apache 2.0"
  - "Platform-native sandboxing: Seatbelt (macOS), bubblewrap (Linux), Windows Sandbox"
  - "MCP client AND server — Codex can be a tool for other agents"
  - "Subagent workflows with per-agent model selection (gpt-5.5, gpt-5.4, gpt-5.4-mini, gpt-5.3-codex-spark)"
  - "Memories system with Chronicle screen-context capture for cross-thread recall"
  - "Lifecycle hooks at 6 events (SessionStart, PreToolUse, PermissionRequest, PostToolUse, UserPromptSubmit, Stop)"
  - "Skills system following open agentskills.io standard with progressive disclosure"
  - "Git worktrees for safe parallel branch work"
  - "Automations for scheduled recurring agent tasks"
created: 2026-05-02
updated: 2026-05-02
---
# Codex CLI — OpenAI's Open-Source Coding Agent

**Source type**: Open-source repository + official documentation. Primary documentation at `developers.openai.com/codex`.

## Repository Facts

- **Repo**: `github.com/openai/codex`
- **Stars**: 79.2K+
- **Forks**: 11.4K
- **Language**: Rust (96.3%), Python (2.7%), TypeScript (0.3%)
- **License**: Apache 2.0
- **Latest release**: v0.128.0 (Apr 30, 2026)
- **Total releases**: 756
- **Build system**: Bazel (monorepo)
- **Key crates**: `codex-core`, `codex-tui`, `codex-cli`, `codex-exec`, `codex-mcp`, `codex-app-server-protocol`

## Architecture

Codex is structured as a Cargo workspace with these key components:

- **`codex-core/`**: Business logic library. Largest crate (actively being refactored to reduce bloat).
- **`codex-tui/`**: Terminal UI built with Ratatui (Rust TUI library).
- **`codex-cli/`**: CLI multitool exposing subcommands.
- **`codex-exec/`**: Headless CLI for non-interactive automation (`codex exec`).
- **`codex-mcp/`**: MCP client and server implementation.
- **`app-server/`**: Local HTTP/WebSocket server for IDE extension communication.
- **SDK**: TypeScript/Node.js SDK for programmatic use.

## Multi-Surface Architecture

Single agent logic runs across four surfaces:
1. **CLI** — Zero-dependency compiled binary
2. **IDE Extension** — VS Code, Cursor, Windsurf integration
3. **Desktop App** — Full GUI (`codex app`)
4. **Web (Cloud)** — `chatgpt.com/codex` for cloud-based agent runs

The App Server (local HTTP/WebSocket) is the bridge between agent core and IDE extensions. App-server protocol v2 defines typed RPC methods with camelCase wire format, TypeScript type generation from Rust structs, and explicit cursor pagination.

## Key Innovations

### 1. Rust-Native Implementation
Zero-dependency compiled binary. No Node.js required (unlike Claude Code). Platform-optimized sandbox integration via native OS APIs.

### 2. Platform-Native Sandboxing
Three-tier sandbox: `read-only` (inspect only), `workspace-write` (edit within workspace), `danger-full-access` (no restrictions). Uses OS-level enforcement: Seatbelt on macOS, bubblewrap on Linux, Windows Sandbox on Windows. Approval policies: `untrusted`, `on-request`, `never`. Writable roots for multi-directory work. Permission profiles with per-domain and per-unix-socket rules.

### 3. Bidirectional MCP
Codex functions as MCP client (connects to external MCP servers) AND MCP server (`codex mcp-server` — other agents can use Codex as a tool). This is architecturally unique among production agents.

### 4. Memories + Chronicle
Opt-in persistent cross-thread memory. Stores under `~/.codex/memories/`. Chronicle captures screen context to bootstrap memories. Background generation (idle-thread-based, rate-limit-aware). Secret redaction. Per-thread controls (`/memories`). Configurable extract/consolidation models.

### 5. Hooks Framework
JSON-configurable lifecycle hooks at 6 events. Exit-code semantics: 0=continue, 2=block. JSON stdin/stdout contracts. Multiple matching hooks run concurrently. Regex matchers filter by tool name. Managed hooks via `requirements.toml` for enterprise enforcement.

### 6. Subagent Workflows
Parallel agent dispatch with per-agent model selection. Addresses "context pollution" and "context rot". Subagents return summaries to main thread. Explicit triggering only (no auto-spawn). Model selection: `gpt-5.5` for demanding agents, `gpt-5.4-mini` for fast scans, `gpt-5.3-codex-spark` for near-instant text-only.

### 7. Git Worktrees
Isolated git worktrees for safe parallel branch work. Enables multiple agents editing different branches without conflicts.

### 8. Skills System
Follows `agentskills.io` open standard. Progressive disclosure: name + description loaded first, full SKILL.md only when skill is activated. 2% context budget cap. Built-in `$skill-creator` and `$skill-installer`. Scopes: REPO, USER, ADMIN, SYSTEM. Plugins for distribution.

### 9. Automations
Scheduled recurring agent tasks — CI-like but agent-driven. No equivalent in Claude Code or Cursor.

### 10. Enterprise Governance
Managed config via `requirements.toml`. Admin hooks. Organization-level policy enforcement. Full enterprise story from day one.

## What This Means for Our Harness

Codex independently validates 7 of our planned features and reveals 5 new gaps. See [[codex-harness-innovations]] for the detailed mapping and [[Research: Codex State-of-the-Art Harness Improvements]] for the synthesis.

## Development Conventions (from AGENTS.md)

- Crate names prefixed with `codex-`. Collapse if statements, inline format! args, use method references over closures.
- Avoid bool/Option parameters in public APIs. Prefer enums, named methods, newtypes.
- Argument comment lint: `/*param_name*/` before opaque literals.
- Exhaustive match statements. Doc comments on new traits.
- Prefer RPITIT native async with explicit Send bounds.
- Object-level deep equality in tests.
- Modules under 500 LoC. Extract from large modules aggressively.
- Snapshot tests (insta) for TUI. `pretty_assertions::assert_eq` for tests.
- Bazel lockfile updates on dependency changes.
