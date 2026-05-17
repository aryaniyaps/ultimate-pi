---
name: harness-plan
description: Produce PlanPacket-aligned harness plans before execute phase. Use with /harness-plan, harness-auto plan phase, or when policy-gate requires an approved plan.
---

# harness-plan

## When to use

- User invokes `/harness-plan` or harness-auto planning phase
- Policy gate blocks mutate tools without approved plan
- Drift monitor requests replan (`harness-drift-replan`)
- User replies with clarification after `needs_clarification`

## Workflow (orchestrator)

1. Use `HarnessSpawnContext` from injected `[HarnessRunContext]` — do not read spec files from disk.
2. Spawn `harness/planner` **once** with that JSON in the prompt (`inherit_context: false`).
3. Parse planner JSON from `get_subagent_result` (`status`, `plan_packet`, `clarification`).
4. Do **not** parent `ask_user` or re-spawn for clarification — planner uses `ask_user` in the subagent.
5. **Only after** subagent approval is synced — write canonical `plan_packet_path`.

## Rules

- `harness/planner` owns clarification and approval `ask_user` (bridged to parent UI).
- Never plan or mutate source inline in the slash-command session.
- context-mode only on harness paths; never lean-ctx.

## Output

- `plan_status`, `risk_level`, `next_command`: `/harness-run` when ready
