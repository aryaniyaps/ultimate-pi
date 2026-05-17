---
description: Build a strict read-only PlanPacket before any mutating work.
argument-hint: "\"<task>\" [--risk low|med|high] [--budget <amount>] [--quick]"
---

# harness-plan

Orchestrator only — spawn `harness/planner`, present draft, run `ask_user`, write plan after Approve. Do **not** plan inline in this session.

## Step 0 — Parse arguments

Read `$ARGUMENTS`:

- task statement (required)
- optional: `--risk low|med|high`, `--budget <amount>`, `--quick`

If task is missing:

`Usage: /harness-plan "<task>" [--risk low|med|high] [--budget <amount>] [--quick]`

`--quick` narrows planning breadth only — it does **not** skip user approval.

## Active plan context

If `[HarnessActivePlan]` is present:

- Read current packet from `plan_packet_path` first.
- Treat task as **revise/amend** unless `/harness-new-run` was used.
- Pass `mode: revise` in spawn context.

Otherwise use canonical path from `[HarnessRunContext]` for greenfield `mode: create`.

## Orchestration (required)

1. Build `HarnessSpawnContext` JSON (`.pi/harness/specs/harness-spawn-context.schema.json`) from injected run/plan context: `run_id`, `plan_packet_path`, `task_summary`, `risk_level`, `quick`, `mode`.
2. Spawn with **`inherit_context: false`**:

```
Agent({ subagent_type: "harness/planner", prompt: "<task + HarnessSpawnContext JSON + output schema>" })
```

3. `get_subagent_result` — parse final JSON (`status`, `plan_packet`, `human_summary`, `clarification`) via fenced `json` block.
4. If `needs_clarification`, call `ask_user` (harness-decisions) with planner `clarification.options`, then re-spawn with answers.
5. Present **full** human-readable plan in chat (scope, assumptions, acceptance_checks, rollback_plan, risk_level).
6. Call `ask_user`: **Approve** / **Request changes** / **Cancel** (harness-decisions). **Do not write** until Approve.
7. On **Request changes**, re-spawn planner with `mode: revise` and user feedback — do not write file.
8. **Only after Approve** — write `PlanPacket` JSON to canonical `plan_packet_path`.

## Parent rules

- Do not mutate project source files — only `plan-packet.json` after approval.
- Validate draft against `.pi/harness/specs/plan-packet.schema.json` before `ask_user` Approve.
- Do not embed `plan_id=` in prompts for policy sync.

## Completion

- `plan_status`: `ready` or `needs_clarification`
- `risk_level` used
- `next_command`: `/harness-run` when `ready` (never `/harness-run --plan …`)
- If `needs_clarification`, user may reply in chat or re-run `/harness-plan`
