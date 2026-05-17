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

Do **not** require or accept `--plan` on this command.

## Active plan context

If `[HarnessActivePlan]` is present in context:

- Read the current PlanPacket from the injected `plan_packet_path` first.
- Treat the user task as **revise/amend** of that packet (not a greenfield plan), unless `/harness-new-run` was used.
- After drift replan or post-abort, update the same canonical file.

If no prior plan file exists, create PlanPacket at the canonical path from `[HarnessRunContext]`.

## Process

1. Parse the requested task and extract concrete scope and constraints.
2. If ambiguity blocks safe execution planning, call `ask_user` (harness-decisions skill). Stop with `needs_clarification` if the user cancels.
3. Build a `PlanPacket` that is valid against `.pi/harness/specs/plan-packet.schema.json`.
4. **Write** the PlanPacket JSON to the canonical `plan_packet_path` before completing.
5. Include rollback artifacts in all required forms.

## Hard requirements

- Do not run mutating tools in this command.
- If task scope is ambiguous, call `ask_user` — do not guess or use prose-only clarification.
- Produce a `PlanPacket` matching `.pi/harness/specs/plan-packet.schema.json`.
- Include rollback artifacts in all three forms:
  - revert command
  - prepared revert branch name
  - patch bundle path
- Set risk level to `high` if uncertainty, broad blast radius, or policy-sensitive surfaces are involved.
- Do **not** embed `plan_id=` in the user prompt for policy sync — the extension sets `approvedPlan` from the written file.

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
2. Confirmation that PlanPacket was written to the canonical path.

Do not proceed to execution from this command.

## Completion behavior

Always end with:

- one-line `plan_status` (`ready` or `needs_clarification`)
- the final `risk_level` used
- explicit `next_command` recommendation: `/harness-run` when `ready` (never `/harness-run --plan …`)
- if `needs_clarification`, tell the user they may reply in plain language or run `/harness-plan` again with updates
