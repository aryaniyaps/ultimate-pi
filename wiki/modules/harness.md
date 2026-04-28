---
type: module
title: Agentic Harness
status: active
created: "2026-04-28"
updated: "2026-04-28"
tags: [module, harness, planning, architecture]
sources:
  - "[[harness-implementation-plan]]"
related:
  - "[[spec-hardening]]"
  - "[[structured-planning]]"
  - "[[grounding-checkpoints]]"
  - "[[adversarial-verification]]"
  - "[[automated-observability]]"
  - "[[persistent-memory]]"
  - "[[schema-orchestration]]"
  - "[[wiki-query-interface]]"
---

# Agentic Harness

An 8-layer mandatory pipeline — every task flows through all layers. No layer can be skipped. See [[harness-implementation-plan]] for build phases and [[adr-008]], [[adr-009]] for key decisions.

## The 8 Layers

| # | Layer | Module | Purpose |
|---|-------|--------|---------|
| 1 | Spec Hardening | [[spec-hardening]] | Block execution until ambiguities resolved |
| 2 | Structured Planning | [[structured-planning]] | Machine-readable task DAG before code |
| 3 | Grounding Checkpoints | [[grounding-checkpoints]] | Smallest verifiable change + drift detection |
| 4 | Adversarial Verification | [[adversarial-verification]] | Critic agents attack, not review |
| 5 | Automated Observability | [[automated-observability]] | Instrumentation is definition-of-done |
| 6 | Persistent Memory | [[persistent-memory]] | claude-obsidian wiki as knowledge base |
| 7 | Schema Orchestration | [[schema-orchestration]] | Archon workflow DAG orchestrates all layers |
| 8 | Wiki Query Interface | [[wiki-query-interface]] | LLM-native search via claude-obsidian skills |

## Key Design Decisions
- **[[adr-008|Black-box QA]]**: Tests from spec only, never from implementation
- **[[adr-009|claude-obsidian Mode B]]**: Replaces Vectra + embeddings with LLM-native search
- **No skip rule**: Verification is mandatory. Agent confidence is not evidence.

## Build Sequence
Schemas → Memory (L6) → Spec Hardening (L1) → Planner (L2) → Execution+Grounding (L3) → QA (L4) → Critics (L5) → Observability (L6) → Archon workflow (L7)
