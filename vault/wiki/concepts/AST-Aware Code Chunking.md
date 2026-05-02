---
type: concept
title: "AST-Aware Code Chunking"
created: 2026-04-30
status: developing
tags:
  - chunking
  - code-rag
  - embeddings
  - semantic-search
related:
  - "[[Semantic Codebase Indexing]]"
  - "[[Context Engine (AI Coding)]]"
  - "[[Contextualized Text Embedding]]"
sources:
  - "[[cast-code-chunking-paper]]"
  - "[[code-chunk-library-supermemory]]"
updated: 2026-05-02

---# AST-Aware Code Chunking

## Definition

Splitting source code into retrievable chunks at Abstract Syntax Tree (AST) boundaries instead of arbitrary character/line limits. Preserves semantic coherence: functions, classes, and methods remain intact within chunks rather than being split mid-body.

## Why It Matters

Line-based chunking (e.g., split every 500 chars) produces fragments like `subtotal += item.price * item.qu` — meaningless without surrounding context. AST-aware chunking ensures each chunk is a complete, self-contained syntactic unit.

## Algorithm (cAST / code-chunk)

1. **Parse** source into AST via tree-sitter
2. **Extract entities**: functions, methods, classes, imports with signatures and docstrings
3. **Build scope tree**: hierarchical parent-child relationships (method → class → file)
4. **Greedy window assignment**: pack complete AST nodes into chunks up to max non-whitespace character limit
5. **Recurse into oversized nodes**: if a single function exceeds chunk limit, recurse into its children
6. **Merge adjacent small windows**: reduce fragmentation
7. **Add contextualized text**: prepend file path, scope chain, signatures, imports before raw code

## Performance Impact

- cAST paper: +4.3 Recall@5 on RepoEval, +2.67 Pass@1 on SWE-bench generation
- code-chunk implementation: 70.1% Recall@5 vs 42.4% fixed-size baseline (with hard negatives + IoU threshold)
- Vectara NAACL 2025: chunking strategy matters as much or more than embedding model choice
