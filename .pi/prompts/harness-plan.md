---
description: Build a strict read-only PlanPacket before any mutating work.
argument-hint: "\"<task>\" [--risk low|med|high] [--budget <amount>] [--quick]"
---

# harness-plan

Orchestrator only — spawn `harness/planner` once; planner runs clarification and approval via `ask_user` (parent UI). Write `plan-packet.json` only after approval. Do **not** plan inline in this session.

## Step 0 — Parse arguments

Read `$ARGUMENTS`:

- task statement (required)
- optional: `--risk low|med|high`, `--budget <amount>`, `--quick`

If task is missing:

`Usage: /harness-plan "<task>" [--risk low|med|high] [--budget <amount>] [--quick]`

`--quick` narrows planning breadth only — it does **not** skip user approval.

## Active plan context

Use injected context only — **do not** read `.pi/harness/specs/*.schema.json` or explore specs with bash.

If `[HarnessActivePlan]` is present:

- Treat task as **revise/amend** unless `/harness-new-run` was used.
- Pass `mode: revise` using the `HarnessSpawnContext` JSON in `[HarnessRunContext]`.

Otherwise use `HarnessSpawnContext` from `[HarnessRunContext]` for greenfield `mode: create`.

## Orchestration (required)

1. Copy the `HarnessSpawnContext=…` JSON from `[HarnessRunContext]` into the spawn prompt (adjust `risk_level`, `quick`, `mode` from `$ARGUMENTS` if needed).
2. Spawn **once** with **`inherit_context: false`**:

```
Agent({ subagent_type: "harness/planner", prompt: "<task + HarnessSpawnContext JSON + output schema>" })
```

3. `get_subagent_result` — parse final JSON (`status`, `plan_packet`, `human_summary`, `clarification`) via fenced `json` block.
4. If `status === "ready"` and user approved in the subagent (`ask_user` Approve), validate `plan_packet` fields, then **write** `PlanPacket` JSON to canonical `plan_packet_path` from `[HarnessRunContext]`.
5. If `needs_clarification`, tell the user the planner is waiting — do **not** re-spawn; user should answer in the subagent or re-run `/harness-plan`.
6. Do **not** call `ask_user` in this parent session for planner clarification or approval.

## Parent rules

- Do not mutate project source files — only `plan-packet.json` after subagent approval is recorded.
- Do not embed `plan_id=` in prompts for policy sync.
- Optional: `/harness-plan-commit` if write was blocked but approval exists.

## Completion

- `plan_status`: `ready` or `needs_clarification`
- `risk_level` used
- `next_command`: `/harness-run` when `ready` (never `/harness-run --plan …`)
