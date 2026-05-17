---
description: Execute only against an approved PlanPacket with strict phase gates.
argument-hint: "[--budget <amount>]"
---

# harness-run

Orchestrator only — spawn `harness/executor`. Do **not** implement inline.

## Step 0 — Parse arguments

- optional: `--budget <amount>`
- Do **not** use `--plan` on happy path — load from `[HarnessActivePlan]` / `plan_packet_path`.

If plan not ready:

`Run /harness-plan first — no approved plan in active run context.`

## Orchestration (required)

1. Confirm `[HarnessActivePlan]` / extension reports plan ready.
2. Build `HarnessSpawnContext` with `mode: execute`, `plan_packet_path`, `run_dir`, `acceptance_checks` from plan file.
3. Spawn:

```
Agent({ subagent_type: "harness/executor", prompt: "<HarnessSpawnContext + handoff>" })
```

4. `get_subagent_result` — parse executor JSON (`execution_status`, validations, rollback refs).
5. Parent persists trace/handoff artifacts under run dir if needed; do not self-review.

## Parent rules

- Refuse if plan not approved.
- On `scope_drift`, stop and recommend `/harness-plan`.
- Do not call `ask_user` for plan-level ambiguity — return to plan command.

## Completion

- `execution_status`: `completed`, `blocked`, or `scope_drift`
- `validation_summary` with command evidence
- `handoff_ready` for evaluator/adversary
- `next_command`: `/harness-eval` (same session — spawn isolated review agents; no new Pi session)
