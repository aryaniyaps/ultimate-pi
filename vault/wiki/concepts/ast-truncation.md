---
type: concept
title: "AST Truncation"
created: 2026-04-30
updated: 2026-04-30
tags:
  - agent-context
  - token-reduction
  - tree-sitter
  - context-window
related:
  - "[[repo-map-ranking]]"
  - "[[progressive-disclosure-agents]]"
  - "[[wozcode]]"
  - "[[research-wozcode-token-reduction]]"
status: developing
---

# AST Truncation

AST truncation is a technique for reducing LLM input tokens during code exploration by returning function/method signatures while stubbing their bodies. Unlike file-level selection (choose which files to show), AST truncation operates at the syntax level: show the interface, hide the implementation.

## How It Works

1. Parse a source file with tree-sitter to produce a concrete syntax tree
2. Identify all definition nodes: functions, methods, classes, type definitions
3. For each definition: return the signature (name, parameters, return type, docstring)
4. Replace the body with a stub: `{ /* ... N lines truncated ... */ }`
5. The model can request full body expansion for specific definitions

## Token Savings

- A typical function signature is 3-10 lines; its body may be 50-500 lines
- For files with many functions, AST truncation can reduce context by 70-90%
- The model still sees the "map" (what exists, how things connect) without the "territory" (full implementation)

## Relationship to Repo-Map Ranking

[[repo-map-ranking]] selects *which files* to include. AST truncation selects *how much* of each file to include. Combined:

| Level | Technique | What's Shown |
|-------|-----------|-------------|
| L0 | File list | Filenames only |
| L1 | AST truncation | Signatures + stubs |
| L2 | AST truncation + imports | Signatures, imports, cross-references |
| L3 | Full content | Everything (on demand) |

This maps to and extends our existing [[progressive-disclosure-agents]] model.

## WOZCODE Implementation

WOZCODE uses AST truncation as its primary input-reduction lever (Source: [[wozcode]]). Combined with ranked search results (not full-file grep dumps), it reduces input tokens on code exploration calls. Their architecture returns "what the model needs" rather than everything found.

## Limitations

- **Dynamic languages**: Python, JavaScript, Ruby — tree-sitter can parse syntax but not always resolve types or call targets statically. Truncation may hide important runtime behavior.
- **Decorators/metaprogramming**: Code generation patterns (Python decorators, Ruby method_missing, JS proxies) create behavior not visible in AST signatures.
- **Test files**: Often rely on implicit context (fixtures, before/after hooks). Truncation may hide critical setup.
- **Parser availability**: Requires tree-sitter grammar for each language in the codebase.

## Implementation Path for Our Harness

1. Leverage existing [[repo-map-ranking]] tree-sitter infrastructure
2. Add a `--truncate` flag to the `read` tool (L8 wiki-query-interface)
3. Implement progressive expansion: model requests `read --expand funcName`
4. Integrate with [[grounding-checkpoints]] (L3) for verification reads
5. Language coverage: start with TypeScript/JavaScript, Python, then extend
