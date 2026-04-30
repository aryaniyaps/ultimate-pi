---
type: concept
title: "Repo Map Ranking"
created: 2026-04-30
updated: 2026-04-30
tags:
  - agent-context
  - graph-algorithms
  - context-window
related:
  - "[[aider-repomap-tree-sitter]]"
  - "[[progressive-disclosure-agents]]"
status: developing
---

# Repo Map Ranking

A graph-based algorithm for selecting the most important portions of a codebase to present to an agent within a token budget.

## Algorithm (from Aider)

1. Parse every source file with tree-sitter to extract AST
2. Identify all symbol definitions (classes, functions, methods, variables, types)
3. Identify all cross-references (where each symbol is used)
4. Build a dependency graph: nodes = files, edges = cross-file references
5. Rank nodes by a centrality measure (most-referenced symbols = most important)
6. Select top-ranked nodes that fit within the token budget
7. For each selected node, include the symbol signatures (not full implementation)

## Properties

- **PageRank-inspired**: importance flows through the graph via references
- **Language-aware**: tree-sitter provides accurate AST parsing per language
- **Token-budgeted**: always fits in the context window
- **Dynamic**: can recompute for sub-trees when working on specific areas

## Why Ranking Matters

Without ranking, agents either:
- Get nothing beyond the current file (miss cross-file dependencies)
- Get everything (blows context window on large repos)

Ranking provides the "Goldilocks" middle: the most important context that fits.
