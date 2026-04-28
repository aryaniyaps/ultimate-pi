---
type: module
title: Schema-Based Orchestration
status: developing
created: 2026-04-28
updated: 2026-04-28
tags: [harness, orchestration, archon, dag, layer-7]
layer: "7"
sources:
  - "[[harness-implementation-plan]]"
related:
  - "[[agentic-harness]]"
  - "[[persistent-memory]]"
  - "[[structured-planning]]"
---

# Schema-Based Orchestration via Archon

Layer 7 of the [[agentic-harness]]. Uses Archon's YAML workflow engine for DAG execution, loop nodes, human approval gates, worktree isolation, and run persistence. No custom orchestration code.

## Architecture

| Need | Archon provides | Alternative build cost |
|------|-----------------|----------------------|
| DAG execution | YAML workflow nodes | Custom task graph executor |
| Loop nodes | `loop: { until: CONDITION }` | Custom rework loop logic |
| Human approval gates | `loop: { until: APPROVED, interactive: true }` | Custom approval UI |
| Worktree isolation | Auto git worktree per run | Custom branch management |
| Run persistence | SQLite/PostgreSQL | Custom state storage |
| Parallel nodes | Concurrent independent nodes | Custom parallel dispatch |

pi.dev extensions implement **intelligence**. Archon implements **orchestration**.

## Primary Workflow: harness-pipeline.yaml

1. **harden-spec** → Spec hardening
2. **resolve-ambiguities** → Loop until no blocking ambiguities
3. **create-plan** → Plan from hardened spec
4. **review-plan** → Adversarial review
5. **approve-plan** → Loop until approved (interactive)
6. **execute-plan** → Loop until all tasks complete (max 100 iterations)
7. **capture-memory** → Store results via wiki-ingest skill

## Terminal States

| State | Meaning |
|-------|---------|
| `completed` | All control objectives passed |
| `blocked` | Mandatory gate/dependency unresolved |
| `replan_required` | Drift, failed critics, or spec change |
| `cancelled` | Precondition not met |
| `failed` | Retries/limits exhausted |

## Extension Interface

| Type | Name |
|------|------|
| Tool | `orchestrate-plan` |
| Tool | `register-agent-capability` |
| Command | `/harness-orchestration-status` |

## Files

- `lib/harness-orchestrator.ts` — Orchestrator class, schema validation, wave tracking
- `extensions/harness-orchestrator.ts` — pi.dev extension registration
- `.archon/workflows/harness-pipeline.yaml`
- `.archon/workflows/harness-fix-issue.yaml`
- `.archon/workflows/harness-quick-review.yaml`