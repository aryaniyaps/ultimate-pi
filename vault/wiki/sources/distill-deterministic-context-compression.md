---
type: source
source_type: github-repo
title: "Siddhant-K-code/distill"
author: "Siddhant Khare"
date_published: 2026-02-24
date_accessed: 2026-05-05
url: "https://github.com/Siddhant-K-code/distill"
confidence: medium
tags:
  - compaction
  - context-engineering
  - deterministic
  - deduplication
key_claims:
  - "4-layer deterministic context compression: Cluster, Select, Rerank, Compress"
  - "~12ms overhead vs ~500ms for LLM compression"
  - "~$0.0001/call vs $0.01+ for LLM compression"
  - "Semantic deduplication removes 30-40% redundant context from multiple sources"
  - "Session-based context window management with token budgets (v0.4.0)"
  - "Persistent context memory with write-time deduplication and hierarchical decay"
  - "143 GitHub stars, v0.4.0 (Feb 2026)"
---

# Distill — Deterministic Context Compression for LLM Agents

## Summary

Distill is a general-purpose context optimization tool that preprocesses context from multiple sources (RAG, tools, memory, docs) before sending to LLMs. It operates as a reliability layer, not a session compactor — its scope is broader but shallower than pi-vcc.

## Key Details

- **Repo**: Siddhant-K-code/distill (143 stars, MIT)
- **Version**: v0.4.0 (Feb 2026)
- **Algorithm**: Agglomerative clustering + Maximal Marginal Relevance (MMR) re-ranking
- **Pipeline**: Over-fetch → Cluster → Select → MMR re-rank → Compress
- **Scope**: Context preprocessing layer (any LLM workflow), not session-specific compaction
- **Observability**: Prometheus metrics + OpenTelemetry tracing
- **Config**: `distill.yaml` file

## How It Differs from pi-vcc

| Dimension | Distill | pi-vcc |
|-----------|---------|--------|
| Scope | Multi-source context preprocessing | Session conversation compaction |
| Input | RAG chunks, tool outputs, docs, memory | Pi session transcript |
| Output | Deduplicated, ranked context | Brief transcript + 5 semantic sections |
| Recall | No lineage recall | Full JSONL lineage recall |
| Integration | General LLM middleware | Pi `session_before_compact` hook |

## Why This Matters

Distill validates the deterministic-over-LLM pattern but operates at a different layer than pi-vcc. Distill preprocesses what goes INTO the context window. pi-vcc compresses what has ALREADY accumulated in the session. Both are complementary, not competing.
