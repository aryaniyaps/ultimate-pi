---
type: module
title: Harness Implementation Plan
status: developing
created: 2026-04-28
updated: 2026-04-28
tags: [harness, ultimate-pi, implementation, architecture]
sources:
  - "[[harness-implementation-plan]]"
related:
  - "[[agentic-harness]]"
  - "[[spec-hardening]]"
  - "[[structured-planning]]"
  - "[[grounding-checkpoints]]"
  - "[[adversarial-verification]]"
  - "[[persistent-memory]]"
  - "[[automated-observability]]"
---

# Harness Implementation Plan

Project page for the ultimate-pi agentic harness implementation. See the full concept at [[agentic-harness]].

## Build Phases

| Phase | What | Files |
|-------|------|-------|
| 0 | Foundation | `lib/harness-schemas.ts`, `lib/harness-config.ts`, `.pi/harness.example.json` |
| 1 | Memory (L6) | Install claude-obsidian skills, scaffold vault Mode B, `extensions/harness-knowledge-base.ts` |
| 2 | Spec Hardening (L1) | `lib/harness-spec.ts`, `extensions/harness-spec.ts` |
| 3 | Planning (L2) | `lib/harness-planner.ts`, `extensions/harness-planner.ts` |
| 4 | Execution+Grounding (L3) | `lib/harness-executor.ts`, `extensions/harness-executor.ts` |
| 5 | Automated QA (L4) | `lib/harness-qa.ts`, `extensions/harness-qa.ts` |
| 6 | Critics (L5) | `lib/harness-critics.ts`, `extensions/harness-critics.ts` |
| 7 | Observability (L6) | `lib/harness-observability.ts`, `extensions/harness-observability.ts` |
| 8 | Archon Integration (L7) | `.archon/workflows/*.yaml`, `.archon/commands/harness.md` |
| 9 | Package integration | Update package.json, README, PLAN.md |

## Key Architecture Decisions

- **[[adr-008|ADR-008 (Black-Box QA)]]**: Tests from spec only, never from implementation
- **[[adr-009|ADR-009 (claude-obsidian Mode B)]]**: Replaces Vectra + embeddings with LLM-native search

## Token Budget

| Layer | Tokens/subtask |
|-------|---------------|
| Spec hardening | ~2,000 |
| Planning + review | ~5,000 |
| Grounding checkpoints | ~500 |
| Automated QA | ~3,500 |
| Critics (2 focus areas) | ~4,000 |
| Observability | ~1,500 |
| Memory writes | ~500 / ~1,500 (standard/deep) |
| **Total per subtask** | **~17,500** |

Typical 5-subtask plan: ~83,500 tokens overhead + coding tokens.