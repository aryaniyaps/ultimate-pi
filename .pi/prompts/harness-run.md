---
description: Execute only against an approved PlanPacket with strict phase gates.
argument-hint: "[--budget <amount>]"
---

# harness-run

Execute implementation only after an approved plan exists in active run context.

## Step 0 — Parse arguments

Read `$ARGUMENTS` and parse:

- optional: `--budget <amount>`

Do **not** parse `--plan` on the happy path. Load the PlanPacket from `[HarnessActivePlan]` / injected `plan_packet_path` only.

If the extension reports plan not ready, stop and return:

`Run /harness-plan first — no approved plan in active run context.`

Advanced recovery only: `--plan <path>` must live under the active run directory (extension validates).

## Process

1. Load PlanPacket from the injected canonical path and confirm it is valid.
2. Execute only within approved scope.
3. Run focused validations mapped to approved acceptance checks.
4. Produce rollback artifacts and handoff references for downstream gates.

## Gate behavior

- Refuse execution if active plan is not ready (extension blocks before the agent runs).
- Keep edits strictly within approved scope.
- If scope drift appears, stop and return to `harness-plan`.
- For **implementation forks** inside approved scope, call `ask_user` with 2–4 options. For plan-level ambiguity, stop and return to `harness-plan`.
- Record evaluator/adversary prerequisites for downstream gates.
- Always prepare rollback artifacts as part of execution output.

## Guardrails

- Do not overthink straightforward approved changes; execute the approved scope directly.
- Only modify files and behaviors covered by the approved `PlanPacket`.
- Never speculate about successful validation without runnable evidence.

## Output

- Implementation summary scoped to approved plan.
- Files changed and why.
- Targeted validations run.
- Trace pointers and rollback references.

## Completion behavior

End with:

1. `execution_status` (`completed`, `blocked`, or `scope_drift`).
2. `validation_summary` (pass/fail with command evidence).
3. `handoff_ready` booleans for evaluator/adversary prerequisites.
4. `next_command`: **New Pi session → `/harness-eval`** when execution completed successfully.
