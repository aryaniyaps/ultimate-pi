---
type: module
title: Adversarial Verification
status: developing
created: 2026-04-28
updated: 2026-04-28
tags: [harness, critics, testing, layer-4, quality]
layer: "4"
sources:
  - "[[harness-implementation-plan]]"
related:
  - "[[agentic-harness]]"
  - "[[spec-hardening]]"
  - "[[automated-observability]]"
---

# Adversarial Verification

Layer 4 of the [[agentic-harness]]. Critic agents **attack**, not review. No code ships without passing adversarial review. See [[adr-008]] for the spec-only QA decision.

## Critic Focus Areas

| Focus | Attack Vector | Default |
|-------|--------------|---------|
| **Correctness** | Logic errors, off-by-one, null derefs | On |
| **Security** | Injection, auth bypass, data exposure | Off (risk-sensitive) |
| **Performance** | N+1 queries, unbounded loops | Off (risk-sensitive) |
| **Spec compliance** | Missing functionality, scope creep | On |

## Verdict Semantics

| Verdict | Action |
|---------|--------|
| `pass` | Proceed to [[automated-observability\|Layer 5]] |
| `fail` | Rework subtask |
| `conditional_pass` | Proceed with logged caveats |

## Retry Logic

Failed → rework → re-review. Max `max_attack_rounds` (default: 2). If exhausted, blocked and escalated to human.

## AI Prompt Pattern

**"Your ONLY job is to find failures. Do NOT suggest improvements. Do NOT be constructive. ATTACK."**

## Extension Interface

| Type | Name |
|------|------|
| Tool | `run-critics` |
| Tool | `run-critic-focus` |
| Command | `/harness-critic-status` |

## Files

- `lib/harness-critics.ts` — CriticAgent class, adversarial prompt templates
- `extensions/harness-critics.ts` — Extension with review routing