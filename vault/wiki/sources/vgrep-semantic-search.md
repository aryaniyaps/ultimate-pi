---
type: source
source_type: official-documentation
title: "vgrep: Privacy-First Semantic Search Engine"
author: CortexLM
date_published: 2025
url: https://github.com/CortexLM/vgrep
confidence: medium
key_claims:
  - "vgrep is a fully local semantic search engine using vector embeddings"
  - "Client-server architecture for fast repeated searches"
  - "GPU acceleration via CUDA, Metal, and Vulkan"
  - "Runs entirely on your machine with no external API calls"
tags:
  - code-search
  - semantic-search
  - embeddings
  - privacy
  - rust
related:
  - "[[vgrep-tool]]"
  - "[[Research: semantic code search tools]]"
created: 2026-04-30
updated: 2026-04-30
status: ingested
---

# vgrep: Privacy-First Semantic Search Engine

## Summary

vgrep (CortexLM/vgrep, 144 ⭐) is a Rust-based client-server semantic search engine that uses vector embeddings to search code, documents, and text by meaning. It runs entirely locally with optional GPU acceleration.

## What It Contributes

vgrep is the strongest architectural alternative to ck: client-server model (daemon + CLI) means repeated searches are fast without re-indexing. GPU acceleration (CUDA/Metal/Vulkan) can provide 10x speedup for embedding generation. However, it lacks grep-compatible flags and MCP integration (as of April 2026).

## Key Capabilities

| Capability | Details |
|---|---|
| **Semantic Search** | Vector embedding-based, search by intent not keywords |
| **Client-Server** | Daemon maintains index in memory; CLI queries are instant |
| **GPU Acceleration** | CUDA, Metal, Vulkan for 10x faster embeddings |
| **Privacy** | 100% local, no telemetry, no external services |
| **Multi-format** | Code, documents, text — not limited to code |
| **Custom Models** | Supports different embedding models |

## Setup

```bash
vgrep init              # ~1GB model download
vgrep models download   # additional models
# Then: vgrep server start && vgrep search "query"
```

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 2 GB | 4+ GB |
| Disk | 1 GB | 2+ GB |
| CPU | 4 cores | 8+ cores |
| GPU | Optional | CUDA/Metal |

## Limitations (Observed)

1. **No grep compatibility**: Not a drop-in replacement. Different CLI syntax entirely.
2. **No MCP integration**: No built-in MCP server. Would need custom wrapper for AI agent use.
3. **Smaller community**: 144 stars vs ck's 1,572. Less documentation, fewer contributors.
4. **Model download required**: Initial setup requires ~1GB download. ck downloads models on first use.
5. **No hybrid (lexical+semantic) search**: Pure embedding search. No BM25/RRF fusion.
6. **No editor integration**: CLI-only. No VSCode/Cursor extension.

## Confidence Assessment

**Medium confidence** — documentation is thinner than ck's. Key architectural claims (client-server, GPU acceleration) are verifiable from the Rust codebase. The absence of MCP integration is a significant gap for AI agent use cases. Community size and update frequency suggest a side project, not an actively maintained product.
