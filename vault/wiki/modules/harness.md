---
type: module
title: Agentic Harness
status: active
created: "2026-04-28"
updated: "2026-04-30"
tags: [module, harness, planning, architecture]
sources:
  - "[[harness-implementation-plan]]"
  - "[[harness-control-frameworks]]"
  - "[[drift-detection-unified]]"
  - "[[Research: sentrux.dev]]"
related:
  - "[[harness-wiki-skill-mapping]]"
  - "[[harness-wiki-pipeline]]"
  - "[[model-adaptive-harness]]"
---

# Agentic Harness

An **8-layer mandatory pipeline** with a **drift monitor layer** and **cross-cutting tool enhancements**. Every task flows through all layers. No layer can be skipped. See [[harness-implementation-plan]] for the master build plan.

## Runtime Pipeline

```
L1: Spec Hardening → L2: Structured Planning → L2.5: Drift Monitor (+sentrux structural)
  ↓                                               ↓
L3: Grounding Checkpoints (+sentrux MCP) → L4: Adversarial Verification → Phase 16: Lint+Format+Arch Gate (+sentrux check)
  ↓
L5: Automated Observability (+Quality Signal) → L6: Persistent Memory (+baselines) → L7: Schema Orchestration → L8: Wiki Query
```

## The 8 Layers (+ Drift Monitor)

| # | Layer | Module | Purpose |
|---|-------|--------|---------|
| 1 | Spec Hardening | [[spec-hardening]] | Block execution until ambiguities resolved |
| 2 | Structured Planning | [[structured-planning]] | Machine-readable task DAG + sprint contracts |
| 2.5 | Runtime Drift Monitor | [[drift-detection-unified]] | Detect stuckness, prune context, restart agent |
| 3 | Grounding Checkpoints | [[grounding-checkpoints]] | Smallest verifiable change + spec-drift detection |
| 4 | Adversarial Verification | [[adversarial-verification]] | Critic agents attack with hard-threshold criteria |
| 5 | Automated Observability | [[automated-observability]] | Instrumentation is definition-of-done |
| 6 | Persistent Memory | [[persistent-memory]] | claude-obsidian wiki as knowledge base |
| 7 | Schema Orchestration | [[schema-orchestration]] | Archon workflow DAG, enforces wiki contract |
| 8 | Wiki Query Interface | [[wiki-query-interface]] | LLM-native search via claude-obsidian skills |

## Cross-Cutting Tool Enhancements (L3)

| Module | Purpose |
|--------|---------|
| [[think-in-code-enforcement]] | Mandatory code-over-data paradigm enforcement |
| AST Truncation | Tree-sitter signature-only reading (Phase P9) |
| Fuzzy Edit Matching | Near-miss tolerance for edit tool (Phase P10) |
| Inline Syntax Validation | Compilers/parsers post-edit, <2s (Phase P11-P12) |
| Semantic Code Search | ck hybrid BM25+embeddings grep (Phase P13) |
| Gitingest | Bulk external repo ingestion (Phase P15) |
| Haiku Model Router | Route exploration to cheap model (Phase P25) |
| **sentrux MCP (9 tools)** | Structural scan, health check, rules check, session baseline/diff — agent self-verifies architecture before committing (Phase P44) |

## Formal Models

| Framework | Page |
|-----------|------|
| H = (E, T, C, S, L, V) | [[harness-h-formalism]] |
| Feedforward-Feedback Controls | [[feedforward-feedback-harness]] |
| Generator-Evaluator Topology | [[generator-evaluator-architecture]] |
| Unified Control Frameworks | [[harness-control-frameworks]] |
| Model-Adaptive Configuration | [[model-adaptive-harness]], [[harness-configuration-layers]] |
| Drift Detection (3 paradigms) | [[drift-detection-unified]] |

## Key Design Decisions

- **[[adr-008|Black-box QA]]**: Tests from spec only, never from implementation
- **[[adr-009|claude-obsidian Mode B]]**: Replaces Vectra + embeddings with LLM-native search
- **[[adr-010|Wiki Tight-Coupling]]**: Every layer reads wiki first, writes wiki after
- **[[adr-011|Consensus Debate with Selective Routing]]**: Multi-agent debate gated by iMAD-style classifier. Winning consensus filed to `wiki/consensus/` for permanent agent alignment.
- **No skip rule**: Verification is mandatory. Agent confidence is not evidence.
- **First-principles quality split**: Syntax (inline), Semantics (L4), Style (final gate)

## Token Budget

~15,000-16,000 tokens per subtask pipeline overhead (with all enhancements). See [[harness-implementation-plan]] for full budget breakdown.

## Build Sequence

Foundation → L1+L2 → L2.5 → L3+Tools → L4+Debate → L5-L8 → Cross-Cutting. See [[harness-implementation-plan]] for all 27 build phases.
