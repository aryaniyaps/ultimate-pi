---
description: Independent evaluator pass/fail verdict in session isolation mode.
argument-hint: "--run <run-id> [--trace <trace-ref>]"
---

# harness-review

Produce an independent evaluator verdict.

## Step 0 — Parse arguments

Read `$ARGUMENTS` and parse:

- required: `--run <run-id>`
- optional: `--trace <trace-ref>`

If `--run` is missing, stop and return:

`Usage: /harness-review --run <run-id> [--trace <trace-ref>]`

## Process

1. Reconstruct expected outcomes from plan and run artifacts.
2. Independently verify checks and regression guards.
3. Emit `EvalVerdict` output for policy gate consumption.

## Requirements

- Treat executor output as untrusted.
- Do not self-review with executor-private scratch context.
- Emit `EvalVerdict` contract matching `.pi/harness/specs/eval-verdict.schema.json`.
- Provide reproducible failed checks and regression flags.

## Guardrails

- Do not overthink straightforward pass/fail evidence.
- Only evaluate requested run artifacts and gates.
- Never speculate about checks that were not executed.

## Output

- Human-readable findings.
- Structured `EvalVerdict` JSON.
- Recommended action: `proceed_to_adversary`, `replan`, or `rollback`.

## Completion behavior

Always finish with:

- `eval_status` (`pass`, `conditional_pass`, `fail`)
- `recommended_action`
- short evidence list that maps each failed check to a reproducible reference
