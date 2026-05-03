---
type: concept
title: "Five Root Cause Metrics (sentrux)"
created: 2026-05-03
tags:
  - sentrux
  - code-metrics
  - graph-theory
related:
  - "[[Quality Signal (sentrux)]]"
  - "[[sentrux]]"
sources:
  - "[[sentrux-docs-root-cause-metrics]]"
---

# Five Root Cause Metrics (sentrux)

sentrux computes 5 independent metrics covering the complete structural properties of a directed attributed dependency graph:

| # | Metric | Theory | Measures |
|---|--------|--------|----------|
| 1 | Modularity | Newman 2004 | Graph community detection — do files cluster into independent modules? |
| 2 | Acyclicity | Martin 2003 | Circular dependency detection via Tarjan's SCC |
| 3 | Depth | Lakos 1996 | Longest dependency chain length |
| 4 | Equality | Gini 1912 | Even distribution of complexity (no god files) |
| 5 | Redundancy | Kolmogorov 1963 | Dead/duplicate code |

## Dimensional Completeness
3 edge properties + 2 node properties = 5 total dimensions:
- **Edge properties:** modularity (clustering), acyclicity (cycles), depth (chain length)
- **Node properties:** equality (concentration), redundancy (unnecessary nodes)

Adding more metrics would either overlap (entropy ≈ Gini) or measure runtime behavior outside static analysis.

## Why These Five?
- **Modularity replaces** coupling, cohesion, god file detection, hotspot detection — all symptoms of low Q
- **Acyclicity is fundamental:** cycles make build order undefined and testing impossible
- **Depth captures** change propagation risk — deep chains mean small changes ripple far
- **Equality targets** god files — the #1 source of AI agent confusion
- **Redundancy captures** dead code — expands AI agent's search space without contributing behavior
