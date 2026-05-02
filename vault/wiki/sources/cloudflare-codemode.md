---
type: source
status: ingested
source_type: official_documentation
title: "Cloudflare Code Mode"
author: "Cloudflare (Kenton Varda, Sunil Pai)"
date_published: 2025-09-29
url: "https://developers.cloudflare.com/agents/api-reference/codemode/"
confidence: high
tags:
  - agent-tools
  - typescript-execution-layer
  - sandbox
  - mcp
key_claims:
  - "LLMs are better at writing code to call APIs than at calling them directly through tool functions"
  - "Code Mode converts MCP tools into typed TypeScript APIs, gives LLM a single 'write code' tool, and executes generated code in isolated Worker sandbox"
  - "Inspired by Apple's CodeAct research"
  - "DynamicWorkerExecutor spins up isolated Worker per execution via WorkerLoader"
  - "Network isolation enforced at Workers runtime level (globalOutbound: null)"
  - "Tool calls dispatched via Workers RPC, not network requests"
  - "3-4x context reduction vs traditional tool calling"
created: 2026-05-02
updated: 2026-05-02

---# Cloudflare Code Mode

Cloudflare's `@cloudflare/codemode` package (beta) implements the **TypeScript execution layer** pattern for AI agents. Instead of exposing dozens of MCP tools as separate function calls in the LLM context, it converts all tools into a typed TypeScript API, gives the LLM a single "write code" tool, and executes the generated JavaScript in a secure, isolated Worker sandbox.

## Architecture

```
Host Worker ←→ Dynamic Worker (isolated sandbox)
  ToolDispatcher     LLM-generated code runs here
  holds tool fns     codemode.myTool() → dispatcher.call()
                     fetch() blocked by default
```

1. `createCodeTool` generates TypeScript type definitions from tools
2. LLM writes an async arrow function calling `codemode.toolName(args)`
3. Code is normalized via AST parsing (acorn)
4. `DynamicWorkerExecutor` spins up isolated Worker via `WorkerLoader`
5. Inside sandbox, `Proxy` intercepts `codemode.*` calls → RPC to host
6. Console output captured and returned in result

## Key Design Decisions

- **TypeScript types as guardrails**: Generated type defs guide LLM to correct implementations
- **Deterministic execution**: Once code is generated, execution is fully deterministic
- **Executor interface is minimal** (`execute(code, fns) → ExecuteResult`): pluggable sandbox backends
- **MCP server wrappers**: `codeMcpServer` and `openApiMcpServer` for wrapping existing servers
- **Tool name sanitization**: hyphens/dots → underscores for valid JS identifiers

## Limitations

- Requires Cloudflare Workers for DynamicWorkerExecutor (custom Executor can use any sandbox)
- JavaScript execution only
- Tool approval (`needsApproval`) not yet supported
- Experimental — may have breaking changes

## Relevance to ultimate-pi

Validates the TypeScript execution layer pattern at production scale (Cloudflare Agents SDK). The minimal Executor interface means we can implement our own sandbox backend (Node.js VM, Deno, or bubblewrap) without depending on Cloudflare infrastructure. The 3-4x context reduction directly supports our token budget goals.
