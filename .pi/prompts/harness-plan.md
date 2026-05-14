---
description: Build a strict read-only PlanPacket before any mutating work.
argument-hint: "\"<task>\" [--risk low|med|high] [--budget <amount>] [--quick]"
---

# harness-plan

Create a machine-readable plan packet before execution.

## Step 0 — Parse arguments

Read `$ARGUMENTS` and parse:

- task statement (required)
- optional flags: `--risk low|med|high`, `--budget <amount>`, `--quick`

If task is missing, stop and return:

`Usage: /harness-plan "<task>" [--risk low|med|high] [--budget <amount>] [--quick]`

## Process

1. Parse the requested task and extract concrete scope and constraints.
2. If ambiguity blocks safe execution planning, request clarification and stop.
3. Build a `PlanPacket` that is valid against `.pi/harness/specs/plan-packet.schema.json`.
4. Include rollback artifacts in all required forms.

## Hard requirements

- Do not run mutating tools in this command.
- If task scope is ambiguous, request clarification and stop.
- Produce a `PlanPacket` matching `.pi/harness/specs/plan-packet.schema.json`.
- Include rollback artifacts in all three forms:
  - revert command
  - prepared revert branch name
  - patch bundle path
- Set risk level to `high` if uncertainty, broad blast radius, or policy-sensitive surfaces are involved.

## Guardrails

- Do not overthink straightforward planning requests.
- Only plan the requested scope; do not execute or widen implementation.
- Never speculate about code or configuration that was not read.

## Output contract

Return:

1. Human-readable plan summary:
   - scope
   - assumptions
   - acceptance checks
   - rollback plan
2. A valid JSON `PlanPacket` object.

Do not proceed to execution from this command.

## Completion behavior

Always end with:

- one-line `plan_status` (`ready` or `needs_clarification`)
- the final `risk_level` used
- explicit `next_command` recommendation (`/harness-run --plan ...` or clarification request)
