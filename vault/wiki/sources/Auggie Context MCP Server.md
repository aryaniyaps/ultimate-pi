---
type: source
source_type: github-repository
author: aj47 (community)
date_published: 2026
url: https://github.com/aj47/auggie-context-mcp
confidence: medium
key_claims:
  - "MCP server wrapping Auggie CLI for codebase context retrieval"
  - "Single tool: query_codebase — intelligent Q&A over repositories"
  - "Pure TypeScript/Node.js, read-only"
  - "Architecture: AI Agent → MCP Protocol → auggie-context-mcp → Auggie CLI → Augment Context Engine"
  - "34 stars, 6 forks"
  - "Official Augment MCP now available at docs.augmentcode.com/context-services/mcp/overview"
tags:
  - mcp
  - augment-code
  - context-engine
  - open-source
---

# Auggie Context MCP Server (Community)

## Summary

A community-built MCP server that exposes Auggie CLI for codebase context retrieval via the Model Context Protocol. Allows AI agents (Claude Desktop, Cursor) to query codebases using Augment's context engine.

**Note**: Augment Code has since released an official Context Engine MCP.

## Architecture

```
AI Agent (Claude, Cursor)
    │ MCP Protocol (stdio)
    ▼
auggie-context-mcp (TypeScript/Node.js)
    │ subprocess
    ▼
Auggie CLI (--print --quiet)
    │
    ▼
Augment Context Engine
```

## Available Tool: query_codebase

Parameters:
- `query` (required): Question about the codebase.
- `workspace_root` (optional): Path to repository root.
- `model` (optional): Model ID to use.
- `rules_path` (optional): Path to additional rules file.
- `timeout_sec` (optional): Query timeout, default 240s.
- `output_format` (optional): `text` or `json`.

## Setup

Uses `npx -y auggie-context-mcp@latest` — no installation needed. Requires Auggie CLI installed and authenticated (`auggie login`). Configuration added to Claude Desktop or Cursor MCP config JSON.

## Relevance to Implementation

Demonstrates the pattern of wrapping a context retrieval engine as an MCP tool. Our own context engine could be exposed similarly — an MCP server that provides `query_codebase` using our semantic index + wiki knowledge.
