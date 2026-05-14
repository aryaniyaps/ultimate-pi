---
description: Run focused benchmark/eval checks and emit structured harness verdict artifacts.
argument-hint: "--run <run-id> [--baseline <ref>] [--suite <name>]"
---

# harness-eval

Run focused evaluations for the run and produce structured artifacts.

## Step 0 — Parse arguments

Read `$ARGUMENTS` and parse:

- required: `--run <run-id>`
- optional: `--baseline <ref>`, `--suite <name>`

If `--run` is missing, stop and return:

`Usage: /harness-eval --run <run-id> [--baseline <ref>] [--suite <name>]`

## Process

1. Run plan-aligned acceptance checks plus focused regressions.
2. Collect evaluator-compatible metrics and guard outcomes.
3. Emit structured artifacts keyed by run ID.

## Requirements

- Validate against accepted plan checks plus focused regression checks.
- Emit evaluator-compatible metrics for downstream policy and router-tuning decisions.
- Include success rate, cost-per-task, and regression guard outcomes when available.

## Guardrails

- Do not overthink simple benchmark outcomes; report measured results directly.
- Only evaluate the requested run/suite/baseline scope.
- Never report synthetic metrics; include only measured values.

## Output

- Benchmark/eval summary table.
- Structured verdict artifacts referenced by run ID.
- Pass/fail recommendation for policy gate consumption.

## Completion behavior

End with a compact evaluator handoff:

- measured metrics (`success_rate`, `cost_per_task`, regression guard status)
- verdict (`pass`/`fail`)
- artifact paths keyed by run ID
