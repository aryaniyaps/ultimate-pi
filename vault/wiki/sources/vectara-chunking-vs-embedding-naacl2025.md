---
type: source
status: ingested
source_type: research-paper
author: Vectara Research Team
date_published: 2024-10-16
url: https://arxiv.org/abs/2410.13070
confidence: high
key_claims:
  - "Chunking configuration influences retrieval quality as much as or more than embedding model selection"
  - "Tested 25 chunking configurations with 48 embedding models"
  - "Published at NAACL 2025 (peer-reviewed)"
  - "Recursive 512-token splitting with 10-20% overlap is benchmark-validated default for general RAG"
tags:
  - chunking
  - embedding-models
  - rag
  - retrieval-quality
  - naacl
created: 2026-05-02
updated: 2026-05-02

---# Vectara NAACL 2025: Chunking Strategy vs Embedding Model

## Summary

Peer-reviewed paper (NAACL 2025, arXiv:2410.13070) from Vectara evaluating the relative impact of chunking strategy vs embedding model choice on RAG retrieval quality. Massive study: 25 chunking configurations × 48 embedding models.

## Key Finding

**Chunking configuration had as much or more influence on retrieval quality as the choice of embedding model.** This means teams that obsess over embedding model selection while ignoring chunking strategy are optimizing the wrong variable.

## Practical Defaults
- Recursive 512-token splitting with 10-20% overlap is the benchmark-validated default for general RAG
- Chunking is the highest-leverage optimization most teams underinvest in

## Relevance to Our Implementation

Validates that our AST-aware chunking strategy is the right investment. We should prioritize chunking quality over embedding model selection. Even MiniLM-L6-v2 with good chunking can outperform larger models with poor chunking.
