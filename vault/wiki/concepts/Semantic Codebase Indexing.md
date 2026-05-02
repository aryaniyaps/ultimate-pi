---
type: concept
title: "Semantic Codebase Indexing"
created: 2026-04-30
status: developing
tags:
  - code-indexing
  - embeddings
  - vector-search
  - ast
aliases:
  - Code Embedding
related:
  - "[[Context Engine (AI Coding)]]"
  - "[[Prompt Enhancement]]"
sources:
  - "[[Augment Context Engine Official]]"
  - "[[Augment Code Codacy AI Giants]]"
updated: 2026-05-02

---# Semantic Codebase Indexing

The process of converting source code into vector embeddings that capture semantic meaning, enabling similarity search across a codebase without relying on exact keyword matching.

## How It Works

### 1. Code Chunking
- Split source files into logical units: functions, classes, methods, modules.
- Use tree-sitter AST parsing for language-aware chunk boundaries.
- Typical chunk size: 200-500 tokens for optimal embedding quality.

### 2. Embedding Generation
- Pass each chunk through an embedding model.
- Options: all-MiniLM-L6-v2 (384-dim, local), CodeBERT, or Voyage AI code embeddings.
- Augment Code uses custom embedding models trained in pairs for maximum retrieval quality.

### 3. Vector Database Storage
- Store embeddings in LanceDB, ChromaDB, or Qdrant.
- Index for fast approximate nearest neighbor (ANN) search.
- Attach metadata: file path, line range, function/class name, dependencies.

### 4. Real-time Sync
- Watch filesystem for changes using watchdog/inotify.
- Re-embed changed files incrementally.
- Augment claims "millisecond-level sync."

### 5. Hybrid Search
- Combine vector similarity (semantic) + BM25/ keyword (lexical).
- Re-rank results by relevance, recency, and relationship proximity.

## Why Semantic > Grep

| Aspect | Grep/Keyword | Semantic Indexing |
|--------|-------------|-------------------|
| Finds related code | Only exact matches | Finds semantically similar code |
| Understands intent | No | Yes — "payment logging" finds telemetry, billing, audit |
| Cross-language | No | Partially — embeddings capture patterns |
| Relationship aware | No | Yes — understands call graphs and imports |
| Noise filtering | Manual | Automatic relevance ranking |

## Implementation Stack (for our harness)

- **Parser**: tree-sitter (18 languages via lean-ctx).
- **Embeddings**: sentence-transformers (all-MiniLM-L6-v2) or voyage-code-2.
- **Vector DB**: LanceDB (embedded, zero-config) or ChromaDB.
- **Sync**: watchdog (Python).
- **Search**: hybrid BM25 + cosine similarity with re-ranking.
