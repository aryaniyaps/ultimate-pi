---
type: source
source_type: open_source_project
title: "Executor — The Integration Layer for AI Agents"
author: "Rhys Sullivan"
date_published: 2026-04-25
updated: 2026-05-01
status: ingested
url: "https://executor.sh"
repo: "https://github.com/RhysSullivan/executor"
confidence: high
tags:
  - agent-tools
  - integration-layer
  - tool-catalog
  - typescript-execution-layer
  - mcp
  - sandbox
  - policy-engine
  - cross-agent
key_claims:
  - "Unified integration layer: one catalog, every agent, shared auth/policies/tools across Cursor, Claude Code, OpenCode"
  - "Three eras framing: Era 1 tool calling (context bloat), Era 2 bash (poor permissions), Era 3 Executor (typed, sandboxed, shared)"
  - "Source-agnostic plugin system: OpenAPI, GraphQL, MCP, gRPC, custom JSON schema — any source type"
  - "Intent-based tool discovery: agents search by what they need, not memorized paths (tools.discover)"
  - "Shared auth: sign in once, every agent shares credentials via local keychain"
  - "Policy engine: auto-approve reads, pause on writes, wildcard rules, human-in-the-loop approval workflows"
  - "Execution lifecycle with pause/resume: stateful executions that pause for auth/approval, resume via executor resume"
  - "Local-first: secrets in OS keychain, nothing leaves machine. PGlite/Postgres persistence."
  - "MCP server mode: point any MCP-compatible agent at Executor to share tool catalog, auth, and policies"
  - "Bun monorepo architecture: apps/executor (CLI/server), apps/web (React UI), packages/ (core logic), plugins/ (source-specific)"
  - "Sandbox: SES (Secure EcmaScript) or Deno subprocesses for isolation"
  - "1.3K GitHub stars, 1,492 commits, MIT license"
created: 2026-05-02

---# Executor (RhysSullivan/executor)

> Product site: [executor.sh](https://executor.sh) | Repo: [github.com/RhysSullivan/executor](https://github.com/RhysSullivan/executor)

Executor is a **local-first integration layer** for AI agents. It gives agents a typed, sandboxed TypeScript runtime with a discoverable tool catalog spanning OpenAPI, GraphQL, MCP, and custom sources. The core insight: instead of loading every tool definition into the LLM's context window (Era 1) or giving agents raw bash access (Era 2), Executor provides a **typed runtime** where agents write code that calls typed functions (Era 3).

## Product Positioning (from executor.sh)

Executor positions itself as "Your missing execution layer" with three-era framing:

| Era | Model | Problem |
|-----|-------|--------|
| **Era 1**: Tool calling | Every schema dumped into context | Tokens wasted, poor performance |
| **Era 2**: Bash | Agent calls CLI directly | Poor permission model, pushes users to dangerously skip permissions |
| **Era 3**: Executor | Agent → executor → typed tools | Typed, sandboxed, shared across all agents |

Five pillars from landing page:
1. **Unified catalog**: Every integration indexed into one typed, discoverable catalog
2. **Shared auth**: Sign in once. Every agent shares credentials
3. **Policies**: Auto-approve reads. Pause on writes. Wildcard rules.
4. **Any agent via MCP**: Executor is an MCP server — point any agent at it
5. **Local-first**: Secrets in keychain. Nothing leaves machine.

## Architecture (from DeepWiki + GitHub README)

### Monorepo Structure (Bun-powered)

| Directory | Purpose | Key Packages |
|-----------|---------|-------------|
| `apps/` | Entrypoint applications | `executor` (CLI/Server), `web` (React UI) |
| `packages/` | Core logic and SDKs | `@executor/platform-sdk`, `@executor/codemode-core`, `@executor/server` |
| `plugins/` | Source-specific logic | `@executor/plugin-mcp-sdk`, `@executor/plugin-openapi-sdk` |
| `examples/` | Integration demos | `sqlite-sdk-consumer`, `mcp-elicitation-demo` |

### Key Components
- **Server** (`@executor/server`): Hono-based HTTP server, REST API (`/v1`), MCP bridge (`/mcp`). `SqlControlPlaneRuntime` manages database and execution services
- **CLI** (`apps/executor`): `executor web`, `executor mcp --stdio`, `executor call`, `executor tools search`, `executor resume`
- **Web UI** (`apps/web`): React + Tailwind + Shadcn UI. Source management, tool explorer, secret management
- **Persistence**: PGlite or local Postgres for workspace state, execution history, secrets
- **Sandbox**: SES (Secure EcmaScript) or Deno subprocesses for isolation

### Execution Lifecycle
Executions are stateful and persisted. Key lifecycle phases:
- `running` → tool execution in sandbox
- `waiting_for_interaction` → paused for human to provide secret or approve action
- `resumed` via `executor resume --execution-id <id>`

### Tool System
- **Source-agnostic plugin system**: OpenAPI, GraphQL, MCP, Google Discovery, custom JSON schema
- **Automatic source detection**: Paste a URL → Executor detects type, indexes tools, handles auth
- **Intent-based discovery**: `tools.discover({ query: "github issues", limit: 5 })` → returns typed paths
- **Typed invocation**: `tools.github.issues.list({ owner: "vercel", repo: "next.js" })`

## How Agents Use It

```typescript
// Discover tools by intent
const matches = await tools.discover({ query: "github issues", limit: 5 });

// Inspect schema
const detail = await tools.describe.tool({ path: matches.bestPath, includeSchemas: true });

// Call with type safety
const issues = await tools.github.issues.list({ owner: "vercel", repo: "next.js" });
```

## Roadmap (from executor.sh)

**Now**: Core SDK & CLI, MCP bridge, Policy engine, Local web UI, Desktop app
**Soon**: Team management & SaaS, Advanced approval workflows, Org-wide source catalog
**Later**: Customer-managed integrations, Workflow primitives (webhooks, crons), Virtual filesystems & KV stores, npm ecosystem support

## Relevance to ultimate-pi Harness

Executor is the closest reference implementation for our P43 TypeScript Execution Layer — but its scope is broader. Key intersections:

| Executor Feature | Our Equivalent | Status |
|-----------------|---------------|--------|
| TS execution runtime | P43 `harness-ts-exec.ts` | Planned |
| Tool catalog + discovery | Not planned (P43 has static type gen only) | **Gap** |
| Policy engine + approval workflows | P35 Permission Subsystem | Planned (less rich) |
| Shared auth across agents | Not addressed | **Gap** |
| Cross-agent MCP server | P39 Harness as MCP Server | Planned |
| Execution pause/resume | Not addressed | **Gap** |
| Multi-source normalization | Not in scope (our tools are harness-native) | Different scope |

**Build vs integrate decision**: Executor can be used as a dependency (MCP server mode + `executor call`). For external API integration (GitHub, Slack, Stripe), Executor is a strong candidate for integration rather than reimplementation. For harness-native tools (read, bash, edit, grep, ck_search), P43's custom TS runtime is still needed — but should borrow Executor's catalog/discovery/policy patterns.
