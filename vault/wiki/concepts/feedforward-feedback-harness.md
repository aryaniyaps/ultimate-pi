---
type: concept
title: "Feedforward-Feedback Harness Controls"
created: 2026-04-30
updated: 2026-04-30
status: seed
tags:
  - harness
  - controls
  - feedforward
  - feedback
related:
  - "[[agentic-harness]]"
  - "[[harness-implementation-plan]]"
  - "[[inline-post-edit-validation]]"
sources:
  - "[[bockeler2026-harness-engineering]]"
  - "[[meng2026-agent-harness-survey]]"

---# Feedforward-Feedback Harness Controls

From Böckeler (2026, Martin Fowler): A cybernetic model of harness controls as guides (feedforward) and sensors (feedback), each split into computational and inferential execution types.

## The Framework

```
FEEDFORWARD (Guides)                   FEEDBACK (Sensors)
├─ Computational                       ├─ Computational
│  ├─ Language servers                 │  ├─ Tests (unit, integration)
│  ├─ CLIs, scripts                    │  ├─ Linters (ESLint, ruff)
│  └─ Codemods                         │  ├─ Type checkers
│                                      │  ├─ Mutation testing
├─ Inferential                         │  └─ Structural tests (ArchUnit)
│  ├─ AGENTS.md, skills                │
│  ├─ Rules, conventions               ├─ Inferential
│  ├─ Reference docs                   │  ├─ AI code review agents
│  └─ How-to guides                    │  ├─ LLM-as-judge
│                                      │  └─ Semantic analysis
```

## Mapping to Our Pipeline

| Control Type | Our Implementation |
|-------------|-------------------|
| Feedforward-Computational | Tool schemas, `tsc --noEmit`, JSON schema validation |
| Feedforward-Inferential | SKILL.md files, ADRs, wiki pages, AGENTS.md |
| Feedback-Computational | Inline post-edit validation (Phase 12), final lint gate (Phase 16) |
| Feedback-Inferential | L4 adversarial verification, L2 plan review, L1 spec review |

## Key Insight

> Separately, agents keep repeating the same mistakes (feedback-only) or encode rules but never find out whether they worked (feedforward-only). Both are needed.

## Unsolved: Behaviour Harness

Functional correctness verification remains the hardest problem. Current approach (AI-generated tests + manual testing) is insufficient. The "approved fixtures" pattern helps selectively but is not a wholesale answer.

## Steering Loop

Human's role: when an issue happens multiple times, improve the feedforward or feedback controls. This is harness engineering as ongoing practice, not one-time configuration.
