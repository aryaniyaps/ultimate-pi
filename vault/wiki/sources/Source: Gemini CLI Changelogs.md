---
type: source
status: ingested
source_type: official-changelog
author: Google
date_published: 2026-04-30
date_accessed: 2026-05-01
url: https://geminicli.com/docs/changelogs/
confidence: high
key_claims:
  - v0.40 (Apr 2026): Offline search (bundled ripgrep), four-tier memory system, Gemma local model support
  - v0.39 (Apr): /memory inbox for skill review, ContextManager architecture, memory leak fixes
  - v0.38 (Apr): Chapters narrative flow, Context Compression Service, persistent policy approvals
  - v0.37 (Apr): Dynamic sandbox expansion, git worktrees, browser agent enhancements
  - v0.36 (Apr): Multi-registry architecture, native macOS Seatbelt/Windows sandboxing, git worktrees
  - v0.34 (Mar): Plan Mode enabled by default, gVisor/LXC sandboxing
  - v0.32 (Mar): Generalist agent for task routing, model steering, Plan Mode external editor
  - v0.29 (Feb): Plan Mode introduced, Gemini 3 default
  - v0.27 (Feb): Event-driven scheduler, /rewind command, queued tool confirmations
  - v0.26 (Jan): skill-creator skill, agent skills enabled by default, generalist agent
  - v0.23 (Jan): Experimental Agent Skills support (agentskills.io)
  - v0.12 (Oct 2025): Codebase investigator subagent, model routing, model selection
  - Launch: Jun 25, 2025
created: 2026-05-02
updated: 2026-05-02
tags: [source]
---
# Gemini CLI Changelogs (v0.4 — v0.40)

## What It Is

Complete release history of Gemini CLI from launch (June 2025) through v0.40 (April 2026). Tracks feature evolution across 40+ weekly releases.

## Feature Evolution Timeline

### Phase 1: Foundation (Jun–Sep 2025, v0.4–v0.9)

- v0.4: Edit tool, CloudRun/Security extensions, prompt completion, citations
- v0.5: FastMCP integration, positional prompts, tool output truncation
- v0.6: JSON output mode, chat sharing, prompt search, A2A protocol RFC
- v0.7: IDE plugin spec, Flutter/nanobanana extensions, experimental todos
- v0.8: **Extensions ecosystem launch** (20+ partners), new homepage/docs
- v0.9: **Interactive Shell** (vim, git rebase), OpenTelemetry GenAI metrics

### Phase 2: Intelligence (Oct–Dec 2025, v0.10–v0.22)

- v0.10: Polish + bug fixing investment
- v0.11: Jules extension (remote workers), stream-json output
- v0.12: **Codebase investigator subagent**, model routing, model selection
- v0.15: **Todo planning**, scrollable UI + mouse support
- v0.16: **Gemini 3 launch**
- v0.18: Policy engine (experimental), Google Workspace extension
- v0.20: Multi-file drag-drop, persistent "Always Allow" policies
- v0.21: Gemini 3 Flash, Rill/Browserbase extensions
- v0.22: Free tier gets Gemini 3, Conductor extension (planning++)

### Phase 3: Agent Architecture (Jan–Apr 2026, v0.23–v0.40)

- v0.23: **Agent Skills support** (agentskills.io), gemini-wrapped
- v0.24: Built-in agent skills, `/agents refresh`, `/skills install/uninstall`
- v0.25: `activate_skill` tool, `pr-creator` skill, skills enabled by default
- v0.26: `skill-creator` skill, agent skills by default, generalist agent
- v0.27: **Event-driven scheduler**, `/rewind`, queued tool confirmations
- v0.28: Positron IDE, custom themes, OAuth improvements
- v0.29: **Plan Mode**, Gemini 3 default for all
- v0.30: SDK package, custom skills, policy engine `--policy` flag
- v0.31: Gemini 3.1 Pro Preview, experimental browser agent
- v0.32: **Generalist agent enabled**, model steering, Plan Mode external editor
- v0.33: A2A remote agents, Plan Mode research subagents
- v0.34: **Plan Mode default**, gVisor/LXC sandboxing
- v0.35: Customizable keyboard shortcuts, vim improvements, JIT context discovery
- v0.36: **Multi-registry architecture**, macOS Seatbelt/Windows sandboxing, git worktrees
- v0.37: Dynamic sandbox expansion, Chapters narrative, browser persistent sessions
- v0.38: **Chapters narrative flow**, Context Compression Service, persistent policy approvals
- v0.39: `/memory inbox`, ContextManager architecture decoupling
- v0.40: Offline search (bundled ripgrep), four-tier memory, Gemma local model support

## Key Patterns

1. **Rapid iteration**: Weekly releases, 6,005 commits in ~10 months
2. **Progressive disclosure**: Features gated behind experimental flags → preview → stable → default
3. **Ecosystem first**: Extensions launched v0.8, Skills v0.23 — both designed for community contribution
4. **Security layered in**: Policy engine (v0.18), sandboxing (v0.34), worktrees (v0.36) — not bolted on
5. **Model-adaptive**: Model routing (v0.12), model steering (v0.32), Gemma local (v0.40)

## Relevance to Ultimate-PI

Gemini CLI's evolution pattern validates our phased approach: foundation → intelligence → agent architecture. Their rapid iteration (weekly releases, experimental → preview → stable → default) is a model for how we should deploy harness improvements. Their "ecosystem first" approach (extensions, skills registries) suggests we should design our tool system for community contribution from the start.
