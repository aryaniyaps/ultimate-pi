---
type: concept
title: "Gemini CLI Architecture (SOTA)"
created: 2026-05-01
updated: 2026-05-01
status: stable
tags:
  - gemini-cli
  - architecture
  - coding-agents
  - harness
related:
  - "[[harness-engineering-first-principles]]"
  - "[[agent-skills-pattern]]"
  - "[[policy-engine-pattern]]"
sources:
  - "[[Source: Google Gemini CLI Architecture Docs]]"
  - "[[Source: Gemini CLI Changelogs]]"
  - "[[Source: Google Blog - Gemini CLI Announcement]]"
---

# Gemini CLI Architecture (SOTA)

## Overview

Gemini CLI is Google's open-source AI coding agent (Apache 2.0, launched June 2025, now v0.40+ with 103k GitHub stars, 6,005 commits, 476 releases). It brings Gemini models (2.5 Pro, 3.0 Pro/Flash, 3.1 Pro) directly into the terminal with a ReAct loop, built-in tools, MCP support, and an extensible architecture.

## Core Architecture

```
User Input → packages/cli (frontend) → packages/core (backend) → Gemini API
                  ↑                          ↓                        ↓
            Display rendering         Tool execution          Tool request / response
                                      State management        Prompt construction
                                      API client
```

Two-package separation: CLI handles UX (input, history, display, themes, config). Core handles logic (API client, prompts, tool registry, state management, session config).

## Key SOTA Harness Components

### 1. Agent Skills (v0.23+)
Progressive disclosure: skills loaded on-demand via `activate_skill` tool. Prevents context rot. Formalized with frontmatter, `/memory inbox` for human review of extracted skills, `skill-creator` meta-skill. [[agent-skills-pattern]]

### 2. Plan Mode (v0.29+)
Structured task decomposition: `/plan` command, todo tracking, annotations, research subagents, external editor support. Enabled by default v0.34. Model steering allows human to guide plan direction.

### 3. Codebase Investigator (v0.12+)
JIT context discovery: subagent automatically explores workspace, resolves relevant files, loads into context. Enhanced with JIT context injection in v0.36. Configurable turn limits.

### 4. Policy Engine (v0.18+)
Pre-execution tool gates: project-level policies, MCP server wildcards, tool annotation matching, persistent approvals, context-aware policies. [[policy-engine-pattern]]

### 5. Event-Driven Hooks (v0.27+)
Event-driven scheduler for tool execution. Hooks for compaction, continuation, lint checks. MessageBus architecture for internal communication. Queued tool confirmations.

### 6. Context Compression Service (v0.38+)
Advanced context management distilling conversation history. Configurable threshold. Complements (doesn't replace) progressive disclosure.

### 7. Chapters Narrative Flow (v0.38+)
Sessions grouped by intent and tool usage. Provides structural narrative across long sessions. Enhances human review UX.

### 8. Subagents + Remote Agents (v0.32+)
Generalist agent for task routing. Specialist subagents with JIT context. Remote agents via A2A protocol (v0.33). Resilient tool rejection with contextual feedback.

### 9. Memory System (v0.39+)
Four-tier memory: prompt-driven transition from static files. Auto Memory (experimental). `/memory inbox` for reviewing extracted patterns.

### 10. Multi-Registry Architecture (v0.36+)
Extensions, skills, MCP servers as separate registries. Extensions loaded in parallel. Partner ecosystem: 20+ extensions launched by v0.12.

### 11. Browser Agent (v0.31+)
Experimental browser agent with persistent sessions. Dynamic tool discovery. Chrome DevTools Protocol access.

### 12. Model Routing (v0.12+)
Auto-selects Flash for simple tasks, Pro for complex. Configurable. Model steering in workspace (v0.32).

### 13. Sandboxing Stack (v0.34+)
Docker, gVisor, LXC, macOS Seatbelt, Windows sandboxing. Dynamic expansion. Tool isolation via SandboxManager.

### 14. Git Worktrees (v0.36+)
Isolated parallel agent sessions. Multiple agents on same repo without conflicts.

### 15. Extensions Ecosystem (v0.8+)
Partner extensions (Hugging Face, Redis, Eleven Labs, Browserbase, etc.). Custom extensions. A2A protocol. SDK package (v0.30).

## Technology Stack

- **Language**: TypeScript 98% + JavaScript 1.8%
- **Packaging**: npm (`@google/gemini-cli`), Homebrew, MacPorts, Anaconda
- **Build**: esbuild
- **Testing**: Integration tests, E2E tests, performance tests, memory tests
- **Models**: Gemini 2.5 Pro, 3.0 Pro/Flash, 3.1 Pro, Gemma (local)
- **Context**: 1M token window (2.5 Pro)

## Free Tier Economics

- 60 requests/minute, 1,000 requests/day
- Personal Google account (OAuth)
- Industry's largest free allowance
- Also supports: Gemini API key, Vertex AI, Code Assist licenses

## Relevance to Ultimate-PI

Gemini CLI's architecture validates our two-layer separation (CLI/Core ≈ our harness pipeline + tool layer). Their rapid iteration model (weekly releases, experimental → preview → stable → default) is a deployment pattern we should adopt. Their ecosystem-first approach (extensions, skills registries) suggests our tool/extension system should be designed for community contribution.
