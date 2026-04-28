---
type: module
title: Structured Planning
status: developing
created: 2026-04-28
updated: 2026-04-28
tags: [harness, planning, dag, layer-2, quality]
layer: "2"
sources:
  - "[[harness-implementation-plan]]"
related:
  - "[[agentic-harness]]"
  - "[[spec-hardening]]"
  - "[[grounding-checkpoints]]"
  - "[[schema-orchestration]]"
---

# Structured Planning

Layer 2 of the [[agentic-harness]]. Produces a machine-readable task DAG reviewed before code begins. No code without a plan.

## Flow

1. `spec_hardened` event → `Planner.createPlan(spec)` → **ExecutionPlan**
2. DAG validation: cycle detection, orphan detection, spec coverage
3. If invalid → regenerate (max 3 revisions)
4. Plan review gate: adversarial critic review OR human approval
5. Store in `.pi/harness/plans/<id>.json`
6. Emit `plan_approved` → Layer 7 (Archon)

## ExecutionPlan Data Contract

Each **PlanNode**: `task_id`, `title`, `description`, `inputs`/`outputs`, `dependencies`, `risk_surface`, `verification`, `status`.

## Validation Checks

- **Cycle detection** — no circular dependencies
- **Orphan detection** — no disconnected nodes
- **Spec coverage** — every success criterion maps to at least one task

## Extension Interface

| Type | Name |
|------|------|
| Tool | `create-plan` |
| Tool | `review-plan` |
| Tool | `approve-plan` |
| Command | `/harness-plan-status` |

## Files

- `lib/harness-planner.ts` — Planner class, DAG generation, validation
- `extensions/harness-planner.ts` — Extension for spec_hardened events