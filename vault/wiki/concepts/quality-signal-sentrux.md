---
type: concept
title: "Quality Signal (sentrux)"
created: 2026-05-03
tags:
  - sentrux
  - code-quality
  - metrics
related:
  - "[[Five Root Cause Metrics (sentrux)]]"
  - "[[sentrux]]"
sources:
  - "[[sentrux-docs-quality-signal]]"
  - "[[sentrux-docs-root-cause-metrics]]"
---

# Quality Signal (sentrux)

A single continuous scalar score (0–10,000) computed as the geometric mean of 5 normalized root cause metrics:

```
quality_signal = (modularity × acyclicity × depth × equality × redundancy)^(1/5) × 10000
```

## Theoretical Basis
The geometric mean is chosen via the Nash Social Welfare theorem (1950): it is the unique aggregation function satisfying Pareto optimality, symmetry, and independence of irrelevant alternatives.

## Properties
- **Ungameable:** No metric can be improved in isolation without genuine structural improvement. Adding useless edges decreases modularity. Removing files without restructuring doesn't affect modularity.
- **Language-agnostic:** Uses graph-theoretic properties computed from tree-sitter parse trees. Works identically across 52 languages.
- **Monotonic convergence:** Designed to improve monotonically under correct agent action — like gradient descent.

## Why Not Letter Grades?
Letter grades (A-F) collapse information. A codebase with D cyclicity but A in everything else gets the same overall grade as B across the board. Continuous score preserves resolution for incremental improvement tracking.

## Normalization
Each metric normalized to [0, 1] before aggregation, ensuring equal weight regardless of raw units.
