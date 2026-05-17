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
4. Do **not** parent `ask_user` / `approve_plan` / `create_plan` or re-spawn — planner uses those tools in the subagent (bridged UI + `create_plan` write).
5. Parent checks `plan_ready` on `harness-run-context` after planner returns — **does not** write `plan-packet.json`.

## Rules

- `harness/planner` owns clarification (`ask_user`), approval (`approve_plan`), and persistence (`create_plan` — only path to `plan-packet.json`; `write`/`edit` blocked).
- Never plan or mutate source inline in the slash-command session.
- context-mode only on harness paths; never lean-ctx.

## Output

- `plan_status`, `risk_level`, `next_command`: `/harness-run` when ready
