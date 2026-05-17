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

1. Spawn `harness/planner` with `HarnessSpawnContext` JSON (see `.pi/harness/specs/harness-spawn-context.schema.json`).
2. Parse planner JSON (`status`, `plan_packet`, `clarification`) from `get_subagent_result`.
3. On `needs_clarification`, `ask_user` with planner options, then re-spawn.
4. Present full plan; `ask_user` Approve / Request changes / Cancel.
5. **Only after Approve** — write canonical `plan_packet_path`.

## Rules

- Parent owns all `ask_user`; `harness/planner` has `disallowed_tools: ask_user`.
- Never plan or mutate source inline in the slash-command session.
- context-mode only on harness paths; never lean-ctx.

## Output

- `plan_status`, `risk_level`, `next_command`: `/harness-run` when ready
