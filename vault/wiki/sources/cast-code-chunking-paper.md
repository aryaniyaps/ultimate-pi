---
type: source
source_type: research-paper
author: Yilin Zhang, Xinran Zhao, Zora Zhiruo Wang, Chenyang Yang, Jiayi Wei, Tongshuang Wu (CMU)
date_published: 2025-06-18
url: https://arxiv.org/abs/2506.15655
confidence: high
key_claims:
  - "AST-based chunking (cAST) boosts Recall@5 by 4.3 points on RepoEval retrieval and Pass@1 by 2.67 on SWE-bench generation"
  - "Existing line-based chunking heuristics break semantic structures, splitting functions or merging unrelated code"
  - "cAST recursively breaks large AST nodes into smaller chunks and merges sibling nodes while respecting size limits"
  - "Structure-aware chunking generates self-contained, semantically coherent units across programming languages"
tags:
  - chunking
  - AST
  - code-rag
  - embedding
  - arxiv
---

# cAST: Enhancing Code Retrieval-Augmented Generation with Structural Chunking via Abstract Syntax Tree

## Summary

Peer-reviewed paper (arXiv:2506.15655, June 2025) from CMU researchers proposing AST-based chunking for code RAG pipelines. The core insight: line-based chunking breaks semantic structures, splitting functions mid-body or merging unrelated code. cAST parses code into ASTs and uses recursive split-then-merge to create self-contained, semantically coherent chunks.

## Key Details

### Problem
- RAG pipelines split documents into retrievable units (chunks)
- Line-based heuristics often break semantic structures
- Splitting functions or merging unrelated code degrades generation quality

### Solution: cAST
- Parse code into Abstract Syntax Tree
- Recursively break large AST nodes into smaller chunks
- Merge sibling nodes while respecting size limits
- Uses non-whitespace character count (not line count) for sizing
- Greedy window assignment with merge-adjacent optimization

### Results
- Recall@5: +4.3 points on RepoEval retrieval
- Pass@1: +2.67 on SWE-bench generation
- Works across programming languages

## Relevance to Our Implementation

This is the foundational paper for AST-aware chunking. The `code-chunk` library (supermemoryai) implements this algorithm in production. We should adopt AST-aware chunking via tree-sitter (already available in lean-ctx) rather than naive text splitting.
