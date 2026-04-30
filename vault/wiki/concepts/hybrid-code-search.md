---
type: concept
status: stable
created: 2026-04-30
updated: 2026-04-30
tags:
  - code-search
  - semantic-search
  - embeddings
  - information-retrieval
related:
  - "[[ck-tool]]"
  - "[[agent-search-enforcement]]"
  - "[[Research: semantic code search tools]]"
---

# hybrid code search

Combining lexical (keyword-based) and semantic (embedding-based) search with Reciprocal Rank Fusion (RRF) for code search.

## Lexical Search (BM25)

- Exact keyword matching
- Fast, deterministic, predictable
- Finds what you ask for literally
- Misses conceptual matches: `"retry logic"` won't find `with_backoff()`, `circuit_breaker()`

## Semantic Search (Embeddings)

- Vector similarity based on meaning
- Finds conceptually related code even without keyword overlap
- Query `"error handling"` finds `try/catch`, `Result<T,E>`, `if err != nil`
- Non-deterministic: results depend on embedding model and threshold
- Can surface irrelevant results (false positives)

## Reciprocal Rank Fusion (RRF)

```
RRF_score(d) = Σ (1 / (k + rank_i(d)))
```

Where `k` is a constant (typically 60) and `rank_i` is the document's rank in each result list. RRF combines ranked lists from lexical and semantic search without requiring score normalization. Documents ranked highly by both methods get the highest fused scores.

## Why Hybrid Matters for AI Agents

AI coding agents need both precision (exact function/class names) and recall (finding all error-handling code). Hybrid search gives both in one query:

```bash
ck --hybrid "connection timeout handling" src/
```

This finds:
1. Exact matches for `timeout`, `connection` (lexical)
2. Related patterns: `setTimeout`, `connect_timeout`, `deadline`, `keepalive` (semantic)
3. RRF re-ranks so items matching both appear first

## Alternatives to RRF

- **Linear combination**: Weighted sum of normalized scores. Requires score calibration.
- **Learning to rank (LTR)**: Trained model predicts relevance. Requires labeled training data.
- **Simple concatenation**: Append semantic results to lexical results. No re-ranking.
