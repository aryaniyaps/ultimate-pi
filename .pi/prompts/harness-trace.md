---
description: Query and summarize harness run traces for replay and forensics.
argument-hint: "[--run <run-id>] [--phase plan|execute|evaluate|adversary|merge]"
---

# harness-trace

Orchestrator — spawn `harness/trace-librarian`.

## Step 0 — Parse arguments

- optional: `--run <run-id>` (recovery only)
- optional: `--phase plan|execute|evaluate|adversary|merge`

Happy path: omit `--run`.

## Orchestration (required)

1. Build `HarnessSpawnContext` with `mode: trace`, `run_dir`, optional phase filter.
2. Spawn:

```
Agent({ subagent_type: "harness/trace-librarian", prompt: "…" })
```

3. `get_subagent_result` — present timeline and artifact index to user.

## Completion

- `trace_completeness`: `complete` or `incomplete`
- Missing artifact checklist
- `next_command` hint (`/harness-incident`, `/harness-review`, or `/harness-critic`)
