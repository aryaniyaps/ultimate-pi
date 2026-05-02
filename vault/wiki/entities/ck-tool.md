---
type: entity
entity_type: tool
status: active
created: 2026-04-30
updated: 2026-04-30
tags:
  - code-search
  - semantic-search
  - rust
  - mcp
  - grep
related:
  - "[[ck-semantic-search]]"
  - "[[hybrid-code-search]]"
  - "[[agent-search-enforcement]]"
  - "[[Research: semantic code search tools]]"
title: "ck (seek)"

---# ck (seek)

**Repository**: [BeaconBay/ck](https://github.com/BeaconBay/ck)  
**Stars**: 1,572 | **Language**: Rust | **License**: MIT / Apache-2.0  
**Install**: `npm install -g @beaconbay/ck-search` or `cargo install ck-search`

Hybrid code search tool: BM25 lexical search + embedding-based semantic search + Reciprocal Rank Fusion (RRF) re-ranking. Drop-in grep replacement with added `--sem` and `--hybrid` modes. Built-in MCP server for AI agent integration. Fully offline.

## Search Modes

| Mode | Flag | Description |
|------|------|-------------|
| Lexical | `ck "pattern"` | BM25-based, grep-compatible |
| Semantic | `ck --sem "concept"` | Embedding-based, finds by meaning |
| Hybrid | `ck --hybrid "query"` | RRF fusion of lexical + semantic |
| Regex | `ck --regex "pattern"` | Standard regex matching |

## Key Flags (grep-compatible)

`-n` (line numbers), `-A/-B/-C` (context lines), `-r` (recursive), `-l` (files-with-matches), `-i` (case-insensitive), `-w` (word-boundary)

## AI Agent Integration

```bash
# Start MCP server
ck --serve

# Register with Claude Code
claude mcp add ck-search -s user -- ck --serve

# MCP tools exposed: ck_search, ck_get, ck_info, ck_reindex
```

## Recommended Agent Queries

```bash
ck --sem --limit 20 "error handling patterns" src/
ck --hybrid "retry logic with backoff" .
ck --sem --threshold 0.7 "authentication middleware" src/
```
