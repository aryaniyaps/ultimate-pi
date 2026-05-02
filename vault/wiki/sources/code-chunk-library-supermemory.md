---
type: source
status: ingested
source_type: open-source-tool
author: Shoubhit Dash / Supermemory AI
date_published: 2025-12-27
url: https://www.nexxel.dev/blog/code-chunk
confidence: high
key_claims:
  - "AST-based code chunking library that implements the cAST paper algorithm in production"
  - "70.1% Recall@5 vs 49.0% (chonkie-code) vs 42.4% (fixed-size baseline)"
  - "Adds contextualized text: file path, scope chain, entity signatures, imports used"
  - "Supports TypeScript, JavaScript, Python, Rust, Go, Java via tree-sitter"
  - "Open source (MIT), npm install code-chunk"
tags:
  - code-chunking
  - AST
  - tree-sitter
  - embeddings
  - open-source
created: 2026-05-02
updated: 2026-05-02

---# code-chunk: AST-Aware Code Chunking Library

## Summary

Production-grade open-source library implementing the cAST paper algorithm. Built by Supermemory AI. Uses tree-sitter for parsing, extracts semantic entities with metadata, builds scope trees, and generates contextualized text for embedding.

## Key Features Beyond cAST Paper

1. **Rich context extraction**: Full entity metadata, scope trees, contextualized text formatting
2. **Overlap support**: Chunks can include last N lines from previous chunk
3. **Streaming**: Process large files without loading everything into memory
4. **Batch processing**: Chunk entire codebases with controlled concurrency
5. **WASM support**: Works in Cloudflare Workers and edge runtimes

## Contextualized Text Format

```
# src/services/user.ts
# Scope: UserService > getUser
# Defines: async getUser(id: string): Promise<User>
# Uses: Database
# After: constructor

  async getUser(id: string): Promise<User> { ... }
```

This prepend enriches raw code with semantic context that embedding models (trained on natural language) can leverage.

## Benchmark Results (SWE-bench Lite Eval)

| Metric | Without Search | With Semantic Search |
|--------|---------------|---------------------|
| Duration | 2.0m | 1.2m |
| Tokens | 4.3k | 2.4k |
| Cost | $0.25 | $0.20 |
| Tool Calls | 19 | 12 |

## Relevance to Our Implementation

We should adopt the same approach: tree-sitter AST parsing (already via lean-ctx) → extract entities → scope tree → greedy window assignment → contextualized text prepending → embed with contextualized text.
