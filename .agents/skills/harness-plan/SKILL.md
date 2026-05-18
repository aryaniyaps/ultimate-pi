---
name: harness-plan
description: PM-grade harness plans — scouts, ExecutionPlan, DAG validation, 4-round Review Gate debate, then approve/create_plan.
---

# harness-plan

## When to use

- `/harness-plan`, harness-auto plan phase, drift replan, policy-gate without approved plan

## Workflow (parent orchestrator)

1. Parallel scouts (graphify + structure; semantic unless `--quick`).
2. Parallel decompose + hypothesis → write `artifacts/*.yaml`.
3. Draft `PlanPacket` (`contract_version: "1.1.0"`) + `ask_user` on material fork.
4. `stack-researcher` → `execution-plan-author` → merge `execution_plan`.
5. **`validate-plan-dag.mjs`** on `plan-packet.yaml` (must pass).
6. **Review Gate:** `/harness-debate-open plan-<run_id>` → 4 rounds (see **harness-debate-plan** skill) → consensus.
7. Apply patches, re-validate DAG, `approve_plan`, `create_plan`.

`--quick` skips semantic scout and post-run adversary only — **not** plan debate.

## Rules

- On-disk plan artifacts are **YAML** (`plan-packet.yaml`, `research-brief.yaml`).
- Subagents read-only; parent writes run artifacts and calls `approve_plan` / `create_plan`.
- context-mode only on harness paths.

## Output

`plan_status`, `plan_review_path`, `next_command: /harness-run` when ready.
