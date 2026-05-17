---
description: Run focused benchmark/eval checks and emit structured harness verdict artifacts.
argument-hint: "[--run <run-id>] [--baseline <ref>] [--suite <name>]"
---

# harness-eval

Run focused evaluations for the active harness run and produce structured artifacts.

## Step 0 — Parse arguments

Read `$ARGUMENTS` and parse:

- optional: `--run <run-id>` (recovery only — active run is used when omitted)
- optional: `--baseline <ref>`, `--suite <name>`

On the happy path, **omit `--run`**. The extension injects the active run from session + project `active-run.json`.

If no active run exists, stop and return:

`No active run. Finish /harness-plan and /harness-run first, or use /harness-run-status.`

Run in a **new Pi session** after execute (review-integrity isolation).

## Process

1. Load plan scope from `[HarnessActivePlan]` (read-only).
2. Run plan-aligned acceptance checks plus focused regressions.
3. Collect evaluator-compatible metrics and guard outcomes.
4. Emit structured artifacts under the active run directory.

## Requirements

- Validate against accepted plan checks plus focused regression checks.
- Emit evaluator-compatible metrics for downstream policy and router-tuning decisions.
- Include success rate, cost-per-task, and regression guard outcomes when available.

## Guardrails

- Do not overthink simple benchmark outcomes; report measured results directly.
- Only evaluate the requested run/suite/baseline scope.
- Never report synthetic metrics; include only measured values.
- Do not edit `plan-packet.json` in this phase.

## Output

Structured eval verdict and summary metrics.

## Completion behavior

End with `eval_status` (`pass` or `fail`) and `next_command` (`/harness-review` on pass; `/harness-plan` or `/harness-incident` on fail).
