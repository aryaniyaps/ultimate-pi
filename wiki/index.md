# Codebase Map & Architecture Wiki

## Overview
This wiki maps the codebase architecture and tracks key software design decisions.

## Modules

| Module | Layer | Summary |
|--------|-------|---------|
| [[harness]] | — | 8-layer mandatory pipeline — every task flows through all layers |
| [[spec-hardening]] | L1 | Block execution until ambiguities resolved |
| [[structured-planning]] | L2 | Machine-readable task DAG before code |
| [[grounding-checkpoints]] | L3 | Smallest verifiable change + drift detection |
| [[adversarial-verification]] | L4 | Critic agents attack, not review |
| [[automated-observability]] | L5 | Instrumentation is definition-of-done |
| [[persistent-memory]] | L6 | claude-obsidian wiki as knowledge base |
| [[schema-orchestration]] | L7 | Archon workflow DAG orchestrates all layers |
| [[wiki-query-interface]] | L8 | LLM-native search via claude-obsidian skills |
| [[harness-implementation-plan]] | — | Build phases, token budgets, risk surface |
| [[harness-wiki-skill-mapping]] | — | Skill-to-layer contract: which wiki skill fires when |
| [[skills]] | — | Agent capability plugins |
| [[extensions]] | — | Programmatic hooks |
| [[bench]] | — | Evaluation tools |

## Decisions

| Decision | Summary |
|----------|---------|
| [[colocate-wiki]] | Co-locating Wiki with Codebase |
| [[adr-008]] | Spec-Only Black-Box QA |
| [[adr-009]] | claude-obsidian Mode B for Persistent Memory |
| [[adr-010]] | Agentic Harness ↔ Wiki Tight-Coupling Contract |

## Components
*(Index of components will go here)*

## Dependencies
*(Index of dependencies will go here)*

## Flows
| Flow | Summary |
|------|---------|
| [[harness-wiki-pipeline]] | Read-first/write-after data flow between harness and wiki |