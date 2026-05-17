---
name: harness-plan
description: Produce PlanPacket-aligned harness plans via decomposition + DARWIN hypothesis before execute phase. Use with /harness-plan, harness-auto plan phase, or when policy-gate requires an approved plan.
---

# harness-plan

## When to use

- User invokes `/harness-plan` or harness-auto planning phase
- Policy gate blocks mutate tools without approved plan
- Drift monitor requests replan (`harness-drift-replan`)
- User replies with clarification after `needs_clarification`

## Workflow (parent orchestrator)

1. Use `HarnessSpawnContext` from injected `[HarnessRunContext]` — do not read spec files from disk.
2. Spawn planning scouts in parallel (`run_in_background: true`, `inherit_context: false`):
   - `harness/planning/scout-graphify` (required)
   - `harness/planning/scout-structure` (required)
   - `harness/planning/scout-semantic` (skip when `--quick`)
3. `get_subagent_result` for each; parse scout JSON.
4. Spawn `harness/planning/decompose` with merged scout JSON → `PlanDecompositionBrief`.
5. Spawn `harness/planning/hypothesis` with decomposition + scouts → `PlanHypothesisBrief`.
6. Parent synthesizes draft `PlanPacket` from hypothesis; `ask_user` when dialectical fork is material.
7. Parallel: `harness/planning/plan-adversary` + `harness/planning/hypothesis-eval` (eval gets task + hypothesis only).
8. Parent calls `approve_plan({ plan_packet, human_summary, research_brief })` then `create_plan`.

## Rules

- Planning subagents are read-only; they never call `ask_user`, `approve_plan`, or `create_plan`.
- Do not spawn `harness/planner` or `harness/planning/planner` (deprecated).
- context-mode only on harness paths; never lean-ctx.

## Output

- `plan_status`, `risk_level`, `plan_review_path`, `next_command`: `/harness-run` when ready
