---
type: source
source_type: official-documentation
title: "ck: Hybrid Code Search"
author: BeaconBay
date_published: 2025-08-30
url: https://beaconbay.github.io/ck/
repo: https://github.com/BeaconBay/ck
confidence: high
key_claims:
  - "ck is a grep-compatible hybrid code search tool combining BM25 lexical search with embedding-based semantic search"
  - "~1M LOC indexed in under 2 minutes, sub-500ms queries"
  - "Completely offline: no code or queries sent to external services"
  - "Built-in MCP server for AI agent integration (ck --serve)"
  - "Supports 80+ languages via tree-sitter chunking"
tags:
  - code-search
  - semantic-search
  - grep
  - mcp
  - rust
related:
  - "[[ck-tool]]"
  - "[[hybrid-code-search]]"
  - "[[Research: semantic code search tools]]"
---

# ck (seek): Hybrid Code Search

## Summary

ck is a Rust-based hybrid code search tool that fuses lexical (BM25/grep) precision with embedding-based semantic recall, then re-ranks results using Reciprocal Rank Fusion (RRF). It positions itself as a drop-in grep replacement with added semantic capabilities.

## What It Contributes

**Primary contribution to AI coding agents**: ck provides a grep-compatible CLI that agents can use directly (`ck --sem "error handling" src/`) while also serving as an MCP server for deeper integration. The MCP tools (`ck_search`, `ck_get`, `ck_info`, `ck_reindex`) give agents first-class access to semantic code search without parsing CLI output.

## Key Capabilities

| Capability | Details |
|---|---|
| **Lexical Search** | BM25-based, grep-compatible flags (-n, -A, -B, -C, -r, -l, -i, -w) |
| **Semantic Search** | `ck --sem "query"` — embedding-based, finds by concept not keywords |
| **Hybrid Search** | `ck --hybrid "query"` — RRF fusion of lexical + semantic results |
| **TUI Mode** | `ck-tui` — interactive terminal interface with live results |
| **Editor Integration** | VSCode/Cursor extension (`code --install-extension ck-search`) |
| **MCP Server** | `ck --serve` — Model Context Protocol for AI agent integration |
| **Incremental Indexing** | Chunk-level re-indexing: only re-embeds changed files |

## Installation

```bash
# From NPM (recommended)
npm install -g @beaconbay/ck-search

# From crates.io
cargo install ck-search

# MCP setup for Claude Code
claude mcp add ck-search -s user -- ck --serve
```

## Limitations (Documented)

1. **No code-aware embeddings**: Uses generic text embeddings (fastembed), not code-specialized models. Structural patterns may be missed.
2. **80 language max**: Tree-sitter chunking covers 80 languages. Unsupported languages fall back to line-based chunking.
3. **No custom model training**: Pre-trained models only. Cannot fine-tune for domain-specific codebases.
4. **HuggingFace cache control**: Cache location controlled by HF env vars (`$HF_HOME`), no ck-specific config.
5. **Memory**: 4-8GB RAM recommended for large codebases (10M+ LOC).
6. **Result pagination**: Max 100 results per page. Exhaustive search requires cursor-based pagination.
7. **No team/cloud sync**: Local-only indexes. No shared or remote indexes.
8. **No AST-level understanding**: Chunking is tree-sitter-based, but embeddings are text, not AST-aware.

## Confidence Assessment

**High confidence** for feature claims — all verified against official documentation and GitHub repo. The limitations section is unusually thorough for a young project (transparency is a good signal). The tool is actively maintained (last commit within days as of April 2026). Stars growth: 1,572 in ~8 months suggests strong community validation.
