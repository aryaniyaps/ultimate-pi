---
description: Build a strict read-only PlanPacket before any mutating work.
argument-hint: "\"<task>\" [--risk low|med|high] [--budget <amount>] [--quick]"
---

# harness-plan

Orchestrator only — spawn `harness/planner` once. The planner runs clarification (`ask_user`), approval (`approve_plan`), and persists the plan (`create_plan`). Do **not** write `plan-packet.json` in this parent session.

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

1. Copy the `HarnessSpawnContext=…` JSON from `[HarnessRunContext]` into the spawn prompt (adjust `risk_level`, `quick`, `mode` from `$ARGUMENTS` if needed). Do **not** add “call ask_user for approval” in the `Agent` prompt — the planner agent instructions already define `approve_plan` / `create_plan`.
2. Spawn **once** with **`inherit_context: false`**:

```
Agent({ subagent_type: "harness/planner", prompt: "<task + HarnessSpawnContext JSON + output schema>" })
```

3. `get_subagent_result` — parse final JSON (`status`, `plan_packet`, `human_summary`, `clarification`) via fenced `json` block. Treat `plan_packet` in that JSON as **read-only summary context** — not input for another approval tool call.
4. If `status === "ready"` and `[HarnessRunContext]` shows `plan_ready: true` (planner called `create_plan`), confirm `plan_packet_path` exists — do **not** write the file yourself.
5. If `needs_clarification`, tell the user the planner is waiting — do **not** re-spawn; user should answer in the subagent or re-run `/harness-plan`.
6. Do **not** call `ask_user`, `approve_plan`, or `create_plan` in this parent session.

## After subagent returns (no second approval)

User approval happens **once**, inside the planner subagent: `approve_plan` uses the parent TUI bridge. You are the orchestrator, **not** an approver.

After `get_subagent_result`:

- If `[HarnessRunContext]` shows `plan_ready: true`, or the transcript already has `harness-plan-approval` / bridged `approve_plan` with **Approve** → planning is complete. **Stop.** Summarize the plan and set `next_command: /harness-run`.
- Do **not** call `approve_plan` to “confirm” using `plan_packet` from subagent JSON.
- Do **not** call `ask_user` with Approve / Request changes / Cancel for the same plan.
- Do **not** re-spawn the planner to “get approval again”.

If `status === "ready"` but `plan_ready` is false → planner approved but `create_plan` may have failed; tell the user to run `/harness-plan-commit` — **not** a second `approve_plan`.

## Parent rules

- Do not mutate project source files in the plan phase.
- Do not embed `plan_id=` in prompts for policy sync.
- Optional recovery: `/harness-plan-commit` only if the planner approved but `create_plan` failed.

## Completion

- `plan_status`: `ready` or `needs_clarification`
- `risk_level` used
- `next_command`: `/harness-run` when `ready` (never `/harness-run --plan …`)
