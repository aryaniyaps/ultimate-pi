---
type: synthesis
title: "Research: executor.sh Harness Integration"
created: 2026-05-01
updated: 2026-05-01
tags:
  - research
  - executor
  - integration-layer
  - harness
  - tool-catalog
  - policy-engine
  - execution-layer
status: developing
related:
  - "[[executor-rhyssullivan]]"
  - "[[ts-execution-layer]]"
  - "[[harness-implementation-plan]]"
  - "[[Research: TypeScript Execution Layer for Agent Tool Calling]]"
  - "[[Research: cursor.sh Harness Innovations]]"
  - "[[Research: Codex State-of-the-Art Harness Improvements]]"
sources:
  - "[[executor-rhyssullivan]]"
---

# Research: executor.sh Harness Integration

## Overview

[executor.sh](https://executor.sh) is the product website for RhysSullivan/executor — an open-source (MIT, 1.3K stars) **integration layer** for AI agents. Research across 3 sources (executor.sh landing page, GitHub README, DeepWiki architecture analysis) reveals that Executor's scope is **broader than our P43 TypeScript Execution Layer** — it is a complete tool catalog + auth + policy + execution runtime. Our existing wiki classified Executor as a "TS execution layer" alongside CodeAct and Cloudflare Code Mode. This research finds that Executor belongs in a **separate category**: the agent integration/runtime layer.

## Key Findings

### executor.sh is NOT just a TS execution layer

Our existing wiki treats Executor as one of three TS execution layer implementations (alongside CodeAct and Cloudflare Code Mode). Executor.sh positions it as "The missing integration layer" — a broader category. The three-era framing reveals the product thesis:

| Era | Model | Executor's critique |
|-----|-------|-------------------|
| Era 1: Tool calling | Every tool schema dumped into context | Tokens wasted, poor performance |
| Era 2: Bash | Agent calls CLI directly | Poor permission model, dangerous |
| Era 3: Executor | Agent → executor → typed tools | Typed, sandboxed, cross-agent |

The TypeScript execution is the **mechanism**, not the **category**. The category is "agent integration layer" — a unified catalog that normalizes diverse tool sources into one typed runtime shared across agents.

### Five pillars absent from our P43 plan

(Source: [[executor-rhyssullivan]])

1. **Unified tool catalog with intent-based discovery**: Not just typed functions — a searchable, indexed catalog where agents call `tools.discover({ query: "github issues", limit: 5 })` instead of memorizing tool paths. Our P43 plans static type generation; Executor adds runtime discovery.

2. **Shared auth across agents**: Sign in once to GitHub/Slack/Stripe via OAuth → every agent (Cursor, Claude Code, custom) shares those credentials. OS keychain storage. Our harness has P35 (Permission Subsystem) but doesn't address cross-tool auth.

3. **Policy engine with approval workflows**: Auto-approve reads, pause on writes, wildcard rules. Human-in-the-loop for sensitive operations. Our P35 plans allow/deny/ask rules but lacks Executor's execution-pause-for-approval pattern.

4. **Execution lifecycle with pause/resume**: Stateful executions that enter `waiting_for_interaction` state when auth or approval is needed. Resumed via `executor resume --execution-id <id>`. Our P43 doesn't address this.

5. **Multi-source normalization**: OpenAPI, GraphQL, MCP, gRPC, custom JSON schema — all normalized into one namespace. Our P43 only targets harness-native L3 tools (read, bash, edit, grep, find).

### Technical architecture (from DeepWiki)

(Source: [[executor-rhyssullivan]])

- **Bun monorepo**: `apps/executor` (CLI/Server), `apps/web` (React UI), `packages/` (core SDKs), `plugins/` (source-specific)
- **Server**: Hono-based HTTP, `SqlControlPlaneRuntime` manages database + execution
- **Persistence**: PGlite or local Postgres (workspace state, execution history, secrets)
- **Sandbox**: SES (Secure EcmaScript) or Deno subprocesses
- **MCP bridge**: `executor mcp` exposes catalog as MCP endpoint

### Rhys Sullivan's design thesis (from Twitter/LinkedIn)

> "LLMs are in desperate need of an execution layer made for them to run tool calls in. A year ago LLMs were making direct calls to tools, we found that it flooded their context with irrelevant information. Then we discovered with coding agents that the less tools you give them, the better they perform."

This independently validates our First Principle #19 (Code is a better tool-calling interface than JSON) and our P43 investment. But Executor goes further: the execution layer should also handle auth, policies, and cross-agent sharing — not just sandboxed code execution.

> "Executor is a highly extended implementation of codemode, that supports adding multiple sources rather than just 1 and a better permissions model." (Source: unrollnow.com thread)

This clarifies the lineage: Cloudflare Code Mode → Executor. Executor extends Code Mode's single-source TS runtime into a multi-source integration layer.

### Roadmap signals (from executor.sh)

- **Now**: Core SDK/CLI, MCP bridge, Policy engine, Local web UI, Desktop app
- **Soon**: Team management/SaaS, Advanced approval workflows, Org-wide source catalog
- **Later**: Customer-managed integrations, Workflow primitives (webhooks, crons), Virtual filesystems & KV stores, npm ecosystem support

The "Soon" tier (team/SaaS) signals that Executor is evolving from a local developer tool into a team infrastructure product. This has implications for our integration strategy — we should integrate at the local/CLI level before it moves upmarket.

## How This Fits Into Our Harness Implementation Plan

### Alignment with existing phases

| Our Phase | Executor Equivalent | Verdict |
|-----------|-------------------|--------|
| P43 TS Execution Layer | TS runtime + typed tool API | **Validated**. Executor independently confirms the TS-over-JSON approach. |
| P39 Harness as MCP Server | MCP bridge (`executor mcp`) | **Validated**. Same pattern. |
| P35 Permission Subsystem | Policy engine (auto-approve/pause rules) | **Partially validated**. Executor has richer policy model (pause/resume). |
| P14 Think-in-Code | Code-as-tool-calling paradigm | **Validated**. Executor extends this from data analysis to all tool calls. |

### Gaps Executor reveals in our plan

1. **No tool catalog with intent-based discovery**: P43 generates static TypeScript type definitions from tool schemas. Executor adds runtime discovery (`tools.discover({ query })`) that lets agents search tools by intent without loading all schemas into context. This is a **fundamental capability gap** — static type gen alone doesn't solve tool discovery at scale (50+ MCP sources).

2. **No shared auth for external tools**: Our harness has no auth management layer. If an agent needs to call GitHub API, Stripe API, or Slack API, each tool call requires separate credential handling. Executor centralizes this — one OAuth flow, all agents share the token. This is a gap for any harness that runs agents in production workflows.

3. **No execution pause/resume for human-in-the-loop**: Our P35 allows blocking tool calls, but doesn't support pausing execution for auth/approval and resuming. Executor's stateful execution lifecycle is a more sophisticated model.

4. **No multi-source tool normalization**: Our tool registry is harness-native (lean-ctx tools, ck_search, Gitingest). We don't normalize external APIs (OpenAPI, GraphQL) into the same tool namespace. Executor does. This may be out of scope for Phase 0 but matters for production harnesses.

### What Executor does that we should NOT adopt

- **Web UI for tool configuration**: Our harness is CLI-only. The React web UI is unnecessary for our use case.
- **Desktop app**: Same — CLI-only scope.
- **Multi-source OpenAPI/GraphQL normalization**: Phase 0 scope is harness-native tools only. External API normalization is post-v1.
- **Team/SaaS management**: Overengineered for a CLI harness. Stay local-first.
- **Cloudflare Workers dependency**: Executor uses SES/Deno — our P43 can match this without CF dependency.

### Build vs Integrate Decision

Executor is MIT-licensed and can be used as a dependency. The integration path:

**For external API integration (post-v1)**: Use Executor as a dependency.
```bash
npm install -g executor
executor mcp  # expose as MCP server
# Agent calls executor via MCP for GitHub/Slack/Stripe/etc.
```

**For harness-native tool optimization (P43)**: Build our own TS runtime. Our L3 tools (read, bash, edit, grep, find, ck_search, ctx_execute) need harness-specific TypeScript types and permission routing. Executor's plugin system can wrap these, but the runtime should be harness-native for tight integration with P35 (permission subsystem) and L7 (orchestration).

**Recommended approach**: 
- P43 built custom for harness-native tools
- Borrow Executor's patterns: catalog with `discover()`, policy engine with pause/resume, typed RPC dispatch
- Post-v1: integrate Executor MCP server for external API access (GitHub, Slack, etc.)

## Impact on Harness Implementation Plan

### P43 should expand to include:

| Sub-phase | What | Inspired by Executor |
|-----------|------|---------------------|
| P43a | Type generation from tool schemas (existing) | — |
| P43b | Tool catalog with intent-based discovery (`tools.discover()`) | Executor's catalog + `tools.discover({ query, limit })` |
| P43c | Policy-aware execution (auto-approve reads, pause on writes) | Executor's policy engine |
| P43d | Execution lifecycle with pause/resume | Executor's `waiting_for_interaction` + `executor resume` |

### P35 should borrow Executor's policy patterns:

| Pattern | Description |
|---------|-------------|
| Auto-approve reads | Deterministic: read-only tool calls pass without LLM permission check |
| Pause on writes | Execution enters `waiting_for_interaction` state; human resumes |
| Wildcard rules | `github.issues.*` → auto-approve; `github.repos.delete` → pause |
| Human-in-the-loop | Execution lifecycle supports pausing for auth/approval and resuming |

## Contradictions

- **Executor vs CodeAct**: Executor uses TypeScript; CodeAct uses Python. Both validate the code-as-tool-calling paradigm. Executor's TypeScript choice is better for our Node.js harness. No contradiction — language follows infrastructure.
- **Executor vs Cloudflare Code Mode**: Executor extends Code Mode with multi-source support and richer policy engine. They're in the same lineage. Executor is the more mature implementation.
- **Local vs SaaS**: Executor is local-first today, but roadmap shows team/SaaS in "Soon". Our harness is local-first by design. If Executor moves to SaaS, our local integration path may diverge.

## Open Questions

- **Can we integrate Executor's `tools.discover()` pattern without adopting its entire plugin system?** Yes — the discovery pattern is an API contract, not tied to the plugin architecture. We can implement `tools.discover({ query, limit })` over our own tool schema registry.
- **Should P43 use Executor as a sandbox backend?** Executor's SES/Deno sandbox is production-ready. We could wrap it rather than building our own Node.js VM. But tight integration with P35 (permission subsystem) favors a custom sandbox. Needs a dedicated spike.
- **Does Executor's pause/resume model work for CLI-only harness?** Yes — `executor resume` is CLI-native. The `waiting_for_interaction` state maps to our harness pausing for human input.
- **Is Executor stable enough to depend on?** 1.3K stars, 1,492 commits, active development. But it's ~1 month old. Dependency risk is medium. Integration via MCP protocol (not code dependency) mitigates this.
- **Will Executor's SaaS move break local-first integration?** Roadmap shows team/SaaS as additive, not replacement. Local-first is a core design principle. Risk is low for current scope.

## Sources

- [[executor-rhyssullivan]]: RhysSullivan/executor — product website (executor.sh), GitHub README, DeepWiki architecture analysis. Updated May 2026 with product positioning and architecture details.
