---
type: concept
status: developing
created: 2026-04-30
updated: 2026-04-30
tags:
  - mcp
  - agent-tools
  - routing
  - architecture
related:
  - "[[agent-search-enforcement]]"
  - "[[ck-tool]]"
  - "[[Research: semantic code search tools]]"
title: "MCP tool routing"
---

# MCP tool routing

Using the Model Context Protocol (MCP) to register semantic code search as a first-class agent tool, then routing code-exploration queries through it instead of generic shell tools.

## MCP Architecture for Code Search

```
┌─────────────────┐     MCP Protocol      ┌──────────────────┐
│  AI Agent       │ ◄──────────────────► │  ck MCP Server    │
│  (Claude Code,  │   tools/list          │  (ck --serve)     │
│   Cursor, etc.) │   tools/call          │                   │
│                 │   resources/read      │  ck_search()      │
│  Native Tools:  │                       │  ck_get()         │
│  - bash         │                       │  ck_info()        │
│  - read         │                       │  ck_reindex()     │
│  - write        │                       │                   │
└─────────────────┘                       └──────────────────┘
```

## ck MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `ck_search` | Semantic/hybrid search | query, path, mode (sem/hybrid/regex), limit, threshold |
| `ck_get` | Get file content with context | file_path, start_line, end_line |
| `ck_info` | Get index statistics | path |
| `ck_reindex` | Force re-index | path, model |

## Registration

```bash
# Claude Code
claude mcp add ck-search -s user -- ck --serve

# Claude Desktop (claude_desktop_config.json)
{
  "mcpServers": {
    "ck-search": {
      "command": "ck",
      "args": ["--serve"]
    }
  }
}

# Cursor (.cursor/mcp.json)
{
  "mcpServers": {
    "ck-search": {
      "command": "ck",
      "args": ["--serve"]
    }
  }
}
```

## Routing Logic

The agent decides which tool to use. MCP tools appear alongside native tools. To influence routing:

1. **Tool descriptions matter**: The MCP tool description is what the agent sees. Make it specific:
   ```
   "ck_search: Semantic code search using embeddings. Use for conceptual 
    queries like 'error handling', 'authentication flow', 'retry logic'. 
    For exact string matching, use grep instead."
   ```

2. **System prompt priority**: Tell the agent to prefer MCP tools for code exploration.

3. **Naming conventions**: Name tools intuitively. `ck_search` is clearer than `tool_1`.

## Limitations

- **No priority/weight system in MCP**: All tools are equal. No way to mark a tool as "preferred."
- **Agent may still choose bash**: If bash grep works, inertia favors it.
- **Tool discovery overhead**: Agent must query `tools/list` to discover MCP tools. Some agents cache this.
- **No "replace native tool" mechanism**: MCP tools are additive, not substitutive. Can't disable bash grep.

## Alternatives to MCP Routing

- **Custom agent framework**: Build your own tool router that intercepts all tool calls and rewrites them.
- **Proxy MCP server**: An MCP server that wraps both native tools and ck, making routing decisions centrally.
- **Shell function aliases**: `function grep() { ck --hybrid "$@" || command grep "$@"; }` — simpler but less controlled.
