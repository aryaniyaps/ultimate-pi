---
type: source
source_type: documentation
title: "sentrux Docs — Quality Signal"
author: sentrux
date_fetched: 2026-05-03
url: https://sentrux.dev/docs/quality-signal/
confidence: high
key_claims:
  - "Quality Signal = (modularity × acyclicity × depth × equality × redundancy)^(1/5) × 10000"
  - "Geometric mean chosen via Nash Social Welfare theorem (1950)"
  - "Pareto optimal, symmetric, independent dimensions"
tags:
  - sentrux
  - quality-metrics
  - geometric-mean
---

# sentrux Docs: Quality Signal

## Formula
```
quality_signal = (modularity × acyclicity × depth × equality × redundancy)^(1/5) × 10000
```
Each metric normalized to [0, 1]. Geometric mean then scaled to 0–10,000.

## Why Geometric Mean?
Nash Social Welfare theorem (1950) proves geometric mean is the unique aggregation satisfying:
- **Pareto optimality:** if all scores improve, signal improves
- **Symmetry:** all root causes weighted equally
- **Independence:** irrelevant dimensions don't affect result

## Why Not Letter Grades?
Letter grades (A-F) collapse information. A codebase could have D cyclicity but A in everything else — same overall grade as B across the board. Continuous score preserves resolution.

## Why Not 20 Proxy Metrics?
Proxy metrics correlate but don't capture root causes. High coupling score + low cohesion score = measuring same thing twice (low modularity). Redundant metrics create illusion of thoroughness.

## Normalization
Each metric mapped to [0, 1] to ensure equal weight before geometric mean.

## Convergence
Quality Signal is designed to improve monotonically under correct agent action. Like gradient descent — no artificial stopping point.

## Theoretical Foundation
Grounded in Nash (1950), Newman (2004), Martin (2003), Lakos (1996), Gini (1912), Kolmogorov (1963).
