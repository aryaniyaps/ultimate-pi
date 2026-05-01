---
type: synthesis
title: "Research: Codex State-of-the-Art Harness Improvements"
created: 2026-05-01
updated: 2026-05-01
tags:
  - research
  - codex
  - harness
  - openai
  - agent-architecture
status: developing
related:
  - "[[codex-harness-innovations]]"
  - "[[codex-open-source-agent-2026]]"
  - "[[harness-implementation-plan]]"
  - "[[model-adaptive-harness]]"
  - "[[agentic-harness]]"
  - "[[cursor-harness-innovations]]"
  - "[[antigravity-agent-first-architecture]]"
  - "[[Research: cursor.sh Harness Innovations]]"
  - "[[Research: Google Antigravity Harness Integration]]"
  - "[[Research: Claude Code State-of-the-Art Harness Improvements]]"
sources:
  - "[[codex-open-source-agent-2026]]"
---

# Research: Codex State-of-the-Art Harness Improvements

## Overview

Codex (OpenAI) is a **fully open-source** (Apache 2.0) Rust-based coding agent with 79.2K+ GitHub stars and 11.4K forks. It is the fourth major production agent analyzed after Cursor, Antigravity, and Claude Code — and uniquely valuable because its architecture is transparent (not reverse-engineered). Codex independently validates 7 of our planned features and reveals 5 new gaps. It also introduces 3 novel architectural patterns that challenge our first principles.

## Key Findings

### Features Codex Independently Validates

| Our Feature | Codex Equivalent | Source |
|---|---|---|
| Model-adaptive harness | Per-agent model selection (gpt-5.5/5.4/5.4-mini/spark) with `model_reasoning_effort` per agent | [[codex-open-source-agent-2026]] |
| Skills system (F0) | agentskills.io standard, progressive disclosure, `$skill-creator`, scoped discovery | [[codex-open-source-agent-2026]] |
| Lifecycle hooks (P33) | 6-event hooks framework (SessionStart, PreToolUse, PermissionRequest, PostToolUse, UserPromptSubmit, Stop) with exit-code semantics | [[codex-open-source-agent-2026]] |
| Subagent specialization (P25) | Parallel subagent dispatch with per-agent model + reasoning effort selection | [[codex-open-source-agent-2026]] |
| Pre-verification isolation (P15b) | Sandbox tiers (read-only, workspace-write) + writable roots for bounded agent work | [[codex-open-source-agent-2026]] |
| Persistent memory (L6) | Memories system (cross-thread, automatic, background-generated) | [[codex-open-source-agent-2026]] |
| Subagent worktree isolation (P25b) | Git worktrees for parallel branch isolation | [[codex-open-source-agent-2026]] |

### New Gaps Identified (5)

1. **No OS-level sandboxing**: Our P35 permission subsystem is policy-only. Codex uses Seatbelt/bubblewrap/Windows Sandbox for OS-level enforcement. This is a first-principles gap: permissions without enforcement are polite requests.

2. **No bidirectional MCP**: Our harness is MCP consumer only. Codex functions as MCP server — other agents can use it as a tool. This enables agent-to-agent composition. Missing from our architecture.

3. **No implicit memory capture**: Our L6 is wiki-based (explicit, human-authored). Codex's Chronicle captures screen context automatically for situational awareness. Missing from our memory layer.

4. **No automations (scheduled tasks)**: Codex supports scheduled recurring agent tasks. No equivalent in our plan. This is a new capability category.

5. **No skills ecosystem tooling**: Our skills lack `$skill-creator`, `$skill-installer`, and agentskills.io standard compatibility. Tools for skill lifecycle management are missing.

### Novel Architectural Patterns (3)

1. **Multi-surface agent architecture**: Single agent logic runs across CLI, IDE extension, Desktop App, and Web via App Server (local HTTP/WebSocket). The agent core is surface-agnostic. This is architecturally distinct from our CLI-only model.

2. **Rust-native implementation as a first-principles choice**: If your agent runs locally on user machines, use a systems language. Zero dependency install, direct OS sandbox API access, compile-time safety. TypeScript (our choice, Claude Code's choice) adds deployment complexity.

3. **Sandbox as foundation, permissions as policy layer**: Codex cleanly separates technical enforcement (sandbox) from user-facing decisions (approvals). This is architecturally cleaner than our mixed approach.

## Entities

- **OpenAI (Codex team)**: 79.2K+ stars, open-source, 756 releases since launch. Primarily Rust engineers.

## Key Concepts

- [[codex-harness-innovations]] — 10 key innovations extracted from Codex architecture
- **App Server Protocol**: Local HTTP/WebSocket bridge between agent core and presentation surfaces. v2 protocol with typed RPC, TypeScript codegen from Rust.
- **Chronicle**: Screen-context capture for memory bootstrapping. Fills the gap between explicit wiki and implicit recall.
- **MCP Server Mode**: Agent as composable tool. Enables agent-to-agent pipelines.
- **Memories**: Automatic cross-thread persistent memory with background generation, rate-limit awareness, and secret redaction.
- **Sandbox Tiers**: read-only → workspace-write → danger-full-access. OS-level enforcement.
- **Worktrees**: Isolated git worktrees for parallel agent branches.

## Contradictions

- **Hook architecture**: Claude Code has 30+ hook events with deterministic exit codes. Codex has 6 events with concurrent execution. Both validated. Our P33 should study both before finalizing. [[codex-open-source-agent-2026]] vs [[claude-code-architecture-vila-lab-2026]].

- **Memory philosophy**: Codex (automatic, screen-capture, background) vs our wiki (explicit, human-authored, checked-in). Both are valid. They serve different purposes. The gap is that we have nothing in the implicit/automatic category. [[codex-open-source-agent-2026]].

- **Context management**: Codex uses subagent summaries to fight "context rot." Claude Code uses structured compaction. Cursor uses dynamic context. Antigravity uses 1M token windows. Four different approaches to the same problem. Our approach (wiki + lean-ctx + hot cache) is a fifth path. All are valid but solve different aspects.

## Open Questions

- Should our harness expose itself as an MCP server (like Codex `codex mcp-server`)? What pipeline stages would be useful as external tools?
- Can we add Chronicle-style screen-context capture without the overhead of a full memory system?
- Should we adopt the agentskills.io standard for skill format compatibility?
- Is a Rust core (post-v1) worth the rewrite cost for zero-dependency install and OS sandbox integration?
- Should we adopt OS-level sandboxing (bubblewrap on Linux) before P35, or build P35 first and add OS enforcement later?

## Sources

- [[codex-open-source-agent-2026]] — GitHub repo (openai/codex) + official docs, 2026
