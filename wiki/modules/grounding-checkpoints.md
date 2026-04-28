---
type: module
title: Grounding Checkpoints
status: developing
created: 2026-04-28
updated: 2026-04-28
tags: [harness, execution, drift-detection, layer-3, quality]
layer: "3"
sources:
  - "[[harness-implementation-plan]]"
related:
  - "[[agentic-harness]]"
  - "[[structured-planning]]"
  - "[[adversarial-verification]]"
  - "[[spec-hardening]]"
---

# Grounding Checkpoints (MVC Execution)

Layer 3 of the [[agentic-harness]]. Enforces smallest verifiable changes with mandatory re-grounding against the spec. Drift detection prevents scope creep.

## Flow

For each ready node in plan:
1. **Pre-execution grounding**: Load HardenedSpec, compare spec_version, compute state_hash
2. If spec changed → `drift_detected` → abort, replan from Layer 2
3. Execute subtask
4. **Post-execution grounding**: Verify output matches declared outputs, no anti-criteria violated
5. Git commit intermediate state
6. Emit `subtask_completed` → Layer 4

## GroundingCheckpoint Data

| Field | Purpose |
|-------|---------|
| `task_id` | Which task |
| `spec_id` / `spec_version_at_checkpoint` | Spec snapshot |
| `drift_detected` | Boolean; if true, execution halts |
| `state_hash` | Hash of all node statuses |
| `committed` / `git_sha` | Commit state |

## Error States

| Error | Recovery |
|-------|----------|
| `spec_drift` | Abort, replan from Layer 2 |
| `anti_criteria_violation` | Mark failed, retry or abort |
| `grounding_checkpoint_failure` | Log warning, degraded mode |
| `all_nodes_failed` | Emit `execution_complete` with failure state |

## Extension Interface

| Type | Name |
|------|------|
| Tool | `execute-next-task` |
| Tool | `grounding-check` |
| Command | `/harness-execution-status` |

## Files

- `lib/harness-executor.ts` — Executor class, grounding logic, drift detection
- `extensions/harness-executor.ts` — Extension for subtask execution