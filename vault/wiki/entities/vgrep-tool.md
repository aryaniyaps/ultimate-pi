---
type: entity
entity_type: tool
status: active
created: 2026-04-30
updated: 2026-04-30
tags:
  - code-search
  - semantic-search
  - embeddings
  - rust
  - privacy
related:
  - "[[vgrep-semantic-search]]"
  - "[[ck-tool]]"
  - "[[Research: semantic code search tools]]"
title: "vgrep"
---

# vgrep

**Repository**: [CortexLM/vgrep](https://github.com/CortexLM/vgrep)  
**Stars**: 144 | **Language**: Rust | **License**: TBD

Vector embedding-based semantic search engine with client-server architecture. Fully local, privacy-first. GPU acceleration via CUDA, Metal, and Vulkan. Searches code, documents, and text by semantic similarity.

## Architecture

```
User Query → vgrep CLI → vgrep daemon (in-memory index) → Results
```

The daemon maintains the embedding index in memory for fast repeated searches. The CLI is a thin client that sends queries to the daemon.

## Key Commands

```bash
vgrep init               # Download models (~1GB)
vgrep models download    # Additional models
vgrep server start       # Start daemon
vgrep search "query"     # Semantic search
```

## Gap Analysis (vs ck)

| Feature | vgrep | ck |
|---------|-------|-----|
| grep-compatible | ❌ | ✅ |
| MCP server | ❌ (planned) | ✅ |
| Hybrid search | ❌ | ✅ (BM25+embeddings) |
| GPU acceleration | ✅ | ❌ |
| Client-server | ✅ | ❌ (CLI only) |
| Editor integration | ❌ | ✅ (VSCode) |
| TUI | ❌ | ✅ |

## Recommendation

Not recommended as primary tool for AI coding harness due to lack of MCP integration and grep compatibility. Worth watching if MCP support ships and the project gains traction.
