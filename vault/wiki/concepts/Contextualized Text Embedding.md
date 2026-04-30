---
type: concept
title: "Contextualized Text Embedding"
created: 2026-04-30
tags:
  - embeddings
  - chunking
  - code-rag
  - semantic-search
related:
  - "[[AST-Aware Code Chunking]]"
  - "[[Semantic Codebase Indexing]]"
sources:
  - "[[code-chunk-library-supermemory]]"
---

# Contextualized Text Embedding

## Definition

Prepending semantic metadata (file path, scope chain, signatures, imports) to raw code before embedding. Transforms code from a bare syntactic fragment into a natural-language-like description that embedding models (trained primarily on natural language) can process effectively.

## Format

```
# src/services/user.ts
# Scope: UserService > getUser
# Defines: async getUser(id: string): Promise<User>
# Uses: Database
# After: constructor

  async getUser(id: string): Promise<User> { ... }
```

## Why It Works

Embedding models like MiniLM-L6-v2 are trained on natural language corpora (Wikipedia, books, web text). They understand sentences and paragraphs, not raw code syntax. By prepending a natural-language description of what the code is, where it lives, and what it depends on, the embedding captures semantic relationships that pure code misses.

## Impact on MiniLM-L6-v2

MiniLM-L6-v2 was not trained on code. Without contextualized text, it embeds `async getUser(id)` as a sequence of tokens without understanding it's inside a UserService class or uses a Database. Contextualized text bridges this gap, making smaller general-purpose models viable for code retrieval.
