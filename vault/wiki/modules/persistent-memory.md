---
type: module
title: Persistent Memory
status: developing
created: 2026-04-28
updated: 2026-04-28
tags: [harness, memory, wiki, knowledge-base, layer-6, claude-obsidian]
layer: "6"
sources:
  - "[[harness-implementation-plan]]"
related:
  - "[[harness-wiki-pipeline]]"
  - "[[harness-wiki-skill-mapping]]"
  - "[[agentic-harness]]"
  - "[[wiki-query-interface]]"
  - "[[schema-orchestration]]"
---

# Persistent Structured Memory

Layer 6 of the [[agentic-harness]]. The knowledge base substrate that every other layer reads and writes. Uses [[adr-009|claude-obsidian skills in GitHub Mode B]] — no custom WikiKnowledgeBase, no Vectra, no embedding model.

## Wiki Structure (Mode B)

```
wiki/
  index.md        # Master catalog
  log.md           # Append-only operation log
  hot.md           # Hot cache: ~500-word recent context
  overview.md      # Executive summary
  decisions/       # Architecture Decision Records
  modules/         # Major modules, packages, services
  components/      # Reusable UI or functional components
  dependencies/    # External deps, versions, risk
  flows/           # Data flows, request paths, auth flows
  sources/         # Summary pages per .raw/ source
  entities/        # People, orgs, products, repos
  concepts/        # Ideas, patterns, frameworks
  meta/            # Dashboards, lint reports, conventions
```

## Search: Three Depth Modes

| Mode | Reads | Token Cost | When |
|------|-------|------------|------|
| **Quick** | hot.md + index.md | ~1,500 | Simple factual lookups |
| **Standard** | hot.md → index.md → 3-5 pages | ~3,000 | Most harness decisions |
| **Deep** | Full wiki + optional web | ~8,000+ | Synthesis, gap analysis |

## Harness Entry Type Mapping

| Harness Entry | Wiki Location | Frontmatter Type |
|--------------|---------------|------------------|
| `decision` | `decisions/` | `decision` |
| `success_pattern` | `modules/` or `components/` | `module`/`component` with `status: mature` |
| `failure_pattern` | `modules/` or `flows/` | with `> [!contradiction]` callout |
| `spec` | `decisions/` | `decision_type: spec` |
| `plan` | `flows/` | `flow` with `plan_status` |

## Write Patterns by Layer

| Layer | When | What Written |
|-------|------|-------------|
| 1 | Spec hardened | Decision (hardening choices) |
| 2 | Plan approved | Decision (planning choices) |
| 3 | Checkpoint recorded | Evolution event |
| 3 | Drift detected | Failure pattern |
| 4 | Subtask verified | Success pattern |
| 4 | Subtask failed | Failure pattern with `> [!contradiction]` |
| 5 | Observability defined | Decision (metric choices) |

## Extension Event Hooks

| Event | Wiki Operation |
|-------|---------------|
| `session_start` | Read hot.md |
| `session_shutdown` | Update hot.md, append to log.md |
| `turn_end` | Auto-capture decision rationale |
| `spec_hardened` | Store spec as decision |
| `plan_approved` | Store plan as flow |

## Dependencies

- 24 obsidian-wiki skills: `npx skills add Ar9av/obsidian-wiki --yes`
- 5 obsidian-skills: `npx skills add kepano/obsidian-skills --yes`
