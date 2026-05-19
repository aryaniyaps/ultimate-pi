---
name: harness-plan
description: PM-grade harness plans — scouts, Phase 3.5 implementation research, ExecutionPlan, DAG validation, selective Review Gate debate, then approve/create_plan.
---

# harness-plan

## When to use

- `/harness-plan`, harness-auto plan phase, drift replan, policy-gate without approved plan

## Workflow (parent orchestrator)

1. Parallel scouts (graphify + structure; semantic unless `--quick`) — each scout ends with **`submit_scout_findings`** (not JSON in final message).
2. Parallel decompose + hypothesis — **`submit_decomposition`** / **`submit_hypothesis`**.
3. **Phase 3.5 (required):** parallel `implementation-researcher` + `stack-researcher` — **`submit_implementation_research`** / **`submit_stack`**; parent merges into `research-brief.yaml` via `write_harness_yaml`.
4. Draft `PlanPacket` shell; `ask_user` on material fork **after** Phase 3.5.
5. `execution-plan-author` → merge `execution_plan`.
6. **`validate-plan-dag.mjs`** (must pass).
7. **`harness_plan_debate_eligibility`** → **`harness_debate_open`** with profile → Review Gate (debate agents use lane **`submit_*`** tools; parent reads submit from `tool_result`, not `finalOutput` JSON).
8. **`harness_artifact_ready`** on required paths → apply patches, re-validate DAG, `approve_plan`, `create_plan`.

`--quick` skips semantic scout and post-run adversary only — **not** implementation research or plan debate.

## Rules

- On-disk plan artifacts are **YAML** (`plan-packet.yaml`, `research-brief.yaml`).
- Subagents read-only; parent writes run artifacts and calls `approve_plan` / `create_plan`.
- context-mode only on harness paths.
- Phase 3.5 required unless documented waiver; high risk requires implementation artifact for approval.

## Output

`plan_status`, `plan_review_path`, `next_command: /harness-run` when ready.
