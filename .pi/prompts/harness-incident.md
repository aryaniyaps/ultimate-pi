---
description: Create incident record with rollback and override trail for harness failures.
argument-hint: "--trigger <reason> [--run <run-id>] [--severity low|med|high|critical]"
---

# harness-incident

Orchestrator — spawn `harness/incident-recorder`; parent writes incident file.

## Step 0 — Parse arguments

- required: `--trigger <reason>`
- optional: `--run <run-id>`, `--severity low|med|high|critical`

If `--trigger` missing:

`Usage: /harness-incident --trigger <reason> [--run <run-id>] [--severity …]`

## Orchestration (required)

1. Build `HarnessSpawnContext` with `mode: incident`, trigger, severity, run paths.
2. Spawn:

```
Agent({ subagent_type: "harness/incident-recorder", prompt: "…" })
```

3. `get_subagent_result` — validate `IncidentRecord` draft; parent writes under `.pi/harness/incidents/`.

## Completion

- `incident_status`: `recorded` or `needs_input`
- `rollback_action`: `execute_now` or `standby`
- `postmortem_required`: true/false
