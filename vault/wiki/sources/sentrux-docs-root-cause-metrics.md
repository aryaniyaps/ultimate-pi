---
type: source
source_type: documentation
title: "sentrux Docs — Root Cause Metrics"
author: sentrux
date_fetched: 2026-05-03
url: https://sentrux.dev/docs/root-cause-metrics/
confidence: high
key_claims:
  - "5 metrics cover 3 edge properties + 2 node properties of a directed attributed graph"
  - "Adding more metrics would overlap or measure outside static analysis"
tags:
  - sentrux
  - code-metrics
  - graph-theory
---

# sentrux Docs: Root Cause Metrics

## 1. Modularity
- **Theory:** Newman 2004, graph community detection
- **Formula:** Q = (1/m) × Σ [A_ij - k_out_i × k_in_j / m] × δ(c_i, c_j)
- **Range:** [-0.5, 1.0]; Q > 0.3 = significant modular structure
- **Ungameable:** Adding useless edges moves graph toward random, decreasing Q
- **Replaces:** coupling, cohesion, god files, hotspots (all symptoms of low Q)

## 2. Acyclicity
- **Theory:** Martin 2003, Acyclic Dependencies Principle
- **Computation:** Tarjan's SCC algorithm counts strongly connected components >1 member
- **Normalization:** score = 1/(1 + cycle_count) — sigmoid
- **Why:** Cycles make build order undefined, change propagation unpredictable

## 3. Depth
- **Theory:** Lakos 1996, levelization
- **Computation:** Longest dependency chain via iterative DFS from entry points
- **Normalization:** score = 1/(1 + depth/8) — midpoint at depth=8
- **Independent from modularity:** Graph can have perfect Q but still 20-deep chain

## 4. Equality (Gini Coefficient)
- **Theory:** Gini 1912, wealth inequality coefficient adapted to code
- **Formula:** G = Σ(2i - n - 1) × x_i / (n × Σ x_i); score = 1 - G
- **Why matters:** God files are the #1 source of AI agent confusion

## 5. Redundancy
- **Theory:** Kolmogorov complexity — gap between actual and minimum equivalent code
- **Impact:** Every line of dead/duplicate code expands AI agent's search space

## Why Exactly 5?
| Dimension | What it captures | Property of |
|-----------|-----------------|-------------|
| Modularity | Edge clustering | Edges |
| Acyclicity | Circular edges | Edges |
| Depth | Edge chain length | Edges |
| Equality | Node property concentration | Nodes |
| Redundancy | Unnecessary nodes | Nodes |

3 edge properties + 2 node properties = 5 total. Complete coverage of directed attributed graph structure under static analysis.
