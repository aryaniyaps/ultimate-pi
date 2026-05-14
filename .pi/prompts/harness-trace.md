---
description: Query and summarize harness run traces for replay and forensics.
argument-hint: "--run <run-id> [--phase plan|execute|evaluate|adversary|merge]"
---

# harness-trace

Retrieve and summarize trace artifacts for a run.

## Step 0 — Parse arguments

Read `$ARGUMENTS` and parse:

- required: `--run <run-id>`
- optional: `--phase plan|execute|evaluate|adversary|merge`

If `--run` is missing, stop and return:

`Usage: /harness-trace --run <run-id> [--phase plan|execute|evaluate|adversary|merge]`

## Process

1. Collect run artifacts from canonical harness locations and provided trace refs.
2. Build phase timeline with policy and gate decision points.
3. Report completeness gaps against strict gate artifact requirements.

## Requirements

- Use `.pi/harness/runs/` and external trace references as source of truth pointers.
- Include phase timeline, artifact refs, and policy decisions.
- Highlight missing artifacts that violate strict gate requirements.

## Guardrails

- Do not overthink simple trace lookups; prioritize completeness and stable references.
- Only report artifacts for the requested run and optional phase filter.
- Never infer artifact existence without verifying source pointers.

## Output

- Replay-ready timeline summary.
- Artifact index (`plan`, `run`, `eval`, `adversary`, `consensus`, `incident`, `rollback`).
- Any integrity or completeness gaps.

## Completion behavior

Always end with:

- `trace_completeness` (`complete` or `incomplete`)
- missing artifact checklist (if any)
- most likely next command (`/harness-incident`, `/harness-review`, or `/harness-critic`)
