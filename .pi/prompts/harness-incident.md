---
description: Create incident record with rollback and override trail for harness failures.
argument-hint: "--trigger <reason> [--run <run-id>] [--severity low|med|high|critical]"
---

# harness-incident

Create a structured incident record for blocked or failed harness runs.

## Step 0 — Parse arguments

Read `$ARGUMENTS` and parse:

- required: `--trigger <reason>`
- optional: `--run <run-id>` (recovery only), `--severity low|med|high|critical`

If `--trigger` is missing, stop and return:

`Usage: /harness-incident --trigger <reason> [--run <run-id>] [--severity low|med|high|critical]`

Use active run when `--run` is omitted.

## Process

1. Gather run context, trigger reason, and severity context.
2. Build `IncidentRecord` with blast radius, mitigation, rollback, and override metadata.
3. Validate incident output contract before finalizing.

## Requirements

- Emit `IncidentRecord` matching `.pi/harness/specs/incident-record.schema.json`.
- Capture blast radius, mitigation, rollback refs, and postmortem requirement.
- If a policy block is overridden, record single-human approver and explicit justification.

## Guardrails

- Do not overthink incident narrative; prioritize factual, auditable records.
- Only record details supported by available run artifacts and explicit inputs.
- Never omit override approver identity or justification when override occurred.

## Output

- Incident summary.
- Structured `IncidentRecord` JSON.
- Immediate rollback decision trail.

## Completion behavior

Finish with:

- `incident_status` (`recorded` or `needs_input`)
- rollback action (`execute_now` or `standby`)
- postmortem requirement (`true`/`false`)
