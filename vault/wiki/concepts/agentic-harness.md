---
type: concept
title: "Agentic Harness"
created: 2026-04-30
updated: 2026-04-30
status: seed
tags: [#concept, #harness]
related:
  - "[[harness]]"
  - "[[harness-implementation-plan]]"
  - "[[harness-wiki-skill-mapping]]"
---

# Agentic Harness

> [!stub] This is a stub page. See [[harness]] for the full module documentation.

The agentic harness is the central execution pipeline in the ultimate-pi architecture. It enforces an 8-layer mandatory workflow where every task must flow through all layers without skipping.

## What it does

- Enforces structured execution (no ad-hoc coding)
- Runs adversarial verification (critic agents attack, not review)
- Maintains persistent memory via the wiki vault
- Orchestrates multi-step plans with grounding checkpoints

## Key pages

- [[harness]] — full module documentation
- [[harness-implementation-plan]] — build phases and token budgets
- [[harness-wiki-pipeline]] — data flow between harness and wiki
- [[adr-008]] — Spec-Only Black-Box QA decision
- [[adr-009]] — Mode B persistent memory decision
- [[adr-010]] — Harness-wiki tight-coupling contract
