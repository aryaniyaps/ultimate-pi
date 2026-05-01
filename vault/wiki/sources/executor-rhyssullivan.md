---
type: source
source_type: open_source_project
title: "Executor — Local-First TS Runtime for AI Agents"
author: "Rhys Sullivan"
date_published: 2026-04-25
url: "https://github.com/RhysSullivan/executor"
confidence: high
tags:
  - agent-tools
  - typescript-execution-layer
  - mcp
  - sandbox
key_claims:
  - "Local-first execution environment: agents get TypeScript runtime, discoverable tool catalog, single place to connect external systems"
  - "Instead of pasting large MCP manifests into every chat, agents run code inside executor and call typed tools"
  - "Supports OpenAPI, GraphQL, MCP, Google Discovery + plugin system for any source type"
  - "MCP server mode: point any MCP-compatible agent at Executor to share tool catalog, auth, and policies"
  - "1.3K GitHub stars, 1,492 commits, MIT license"
---

# Executor (RhysSullivan/executor)

Executor is a **local-first TypeScript execution layer** for AI agents. It fixes the core problem identified in the TypeScript execution layer pattern: instead of loading every tool definition into the LLM's context window, the agent writes code that calls typed functions in a sandboxed runtime.

## Architecture

- **Tool catalog**: Single discovery point for all tools (OpenAPI, GraphQL, MCP, custom)
- **Typed TypeScript runtime**: Agents call `tools.discover({ query, limit })` → `tools.namespace.method(args)`
- **MCP server mode**: Exposes catalog as MCP endpoint for any compatible agent
- **Local daemon**: Persistent runtime with web UI at `http://127.0.0.1:4788`
- **CLI**: `executor call`, `executor tools search`, `executor mcp`

## How Agents Use It

```typescript
// Discover tools by intent
const matches = await tools.discover({ query: "github issues", limit: 5 });

// Inspect schema
const detail = await tools.describe.tool({ path: matches.bestPath, includeSchemas: true });

// Call with type safety
const issues = await tools.github.issues.list({ owner: "vercel", repo: "next.js" });
```

## Key Design Decisions

- **TypeScript, not Python**: Unlike CodeAct (Python), Executor uses TypeScript — matching the language most LLMs have seen in training data
- **Local-first**: No cloud dependency. Runtime runs on developer's machine
- **Source-agnostic**: Plugin system for any source type with JSON schema
- **Cross-agent**: Single tool catalog shared across Cursor, Claude Code, OpenCode, etc.

## Relevance to ultimate-pi

Closest implementation to what our harness needs: a local TypeScript sandbox that gives agents a typed API surface for tools. The `tools.discover()` pattern solves the tool discovery problem without loading all tool definitions into context. Its MCP server mode aligns with our P39 (Harness as MCP Server). The CLI-first design matches our architecture.
