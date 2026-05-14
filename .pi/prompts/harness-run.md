---
description: Execute only against an approved PlanPacket with strict phase gates.
argument-hint: "--plan <path-to-plan-packet.json> [--budget <amount>]"
---

# harness-run

Execute implementation only after an approved plan exists.

## Step 0 — Parse arguments

Read `$ARGUMENTS` and parse:

- required: `--plan <path-to-plan-packet.json>`
- optional: `--budget <amount>`

If `--plan` is missing, stop and return:

`Usage: /harness-run --plan <path-to-plan-packet.json> [--budget <amount>]`

## Process

1. Validate `--plan` input and confirm it is a valid approved `PlanPacket`.
2. Execute only within approved scope.
3. Run focused validations mapped to approved acceptance checks.
4. Produce rollback artifacts and handoff references for downstream gates.

## Required input

- `--plan` must point to a valid `PlanPacket`.

## Gate behavior

- Refuse execution if no valid plan packet is provided.
- Keep edits strictly within approved scope.
- If scope drift appears, stop and return to `harness-plan`.
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
