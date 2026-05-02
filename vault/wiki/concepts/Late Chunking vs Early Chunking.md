---
type: concept
title: "Late Chunking vs Early Chunking"
created: 2026-04-30
status: developing
tags:
  - chunking
  - embeddings
  - rag
  - semantic-search
related:
  - "[[AST-Aware Code Chunking]]"
  - "[[Contextualized Text Embedding]]"
sources:
  - "[[vectara-chunking-vs-embedding-naacl2025]]"
updated: 2026-05-02

---# Late Chunking vs Early Chunking

## Definitions

- **Early chunking (standard)**: Split text → embed each chunk separately. Each chunk's embedding only sees its own text.
- **Late chunking**: Embed the entire document first (producing token-level embeddings), then pool token embeddings into chunk-level embeddings using chunk boundaries. Each chunk's embedding "sees" the full document context.
- **Contextual retrieval**: An intermediate approach: prepend document-level context to each chunk before embedding. Simpler than late chunking, captures some cross-chunk context.

## Trade-offs

| Approach | Semantic Coherence | Compute Cost | Implementation Complexity |
|----------|-------------------|--------------|---------------------------|
| Early chunking | Lowest | Lowest | Simplest |
| Contextual retrieval | Medium | Medium | Moderate |
| Late chunking | Highest | Highest | Complex |

## Research Findings (arXiv:2504.19754)

Late chunking + contextual retrieval evaluated for RAG systems:
- Contextual retrieval preserves semantic coherence more effectively than early chunking
- But requires greater computational resources (embeds full documents)
- For code: contextual retrieval (prepending scope/file context) is the sweet spot — better than bare early chunking, cheaper than full late chunking

## Relevance to Our Implementation

We implement **contextual retrieval** (not full late chunking): prepend file path, scope chain, signatures, and imports to each chunk before embedding. This gives us much of the benefit at moderate cost.
