---
description: Adversarial reviewer command with reproducible, merge-blocking findings.
argument-hint: "[--run <run-id>] [--trace <trace-ref>] [--risk low|med|high]"
---

# harness-critic

Run adversarial review against the candidate result.

## Step 0 — Parse arguments

Read `$ARGUMENTS` and parse:

- optional: `--run <run-id>` (recovery only)
- optional: `--trace <trace-ref>`, `--risk low|med|high`

On the happy path, **omit `--run`**. Use active run context. Prefer a session isolated from execute.

## Process

1. Assume hidden regressions exist and identify likely fault surfaces.
2. Challenge evaluator/executor assumptions with reproducible probes.
3. Emit structured adversarial findings for severity policy consumption.

## Requirements

- Assume hidden regressions exist until disproven.
- Attempt to invalidate evaluator assumptions with concrete evidence.
- Emit `AdversaryReport` matching `.pi/harness/specs/adversary-report.schema.json`.
- Flag `block_merge=true` for high-confidence correctness/security/test-integrity risks.

## Guardrails

- Do not overthink speculative attacks; prioritize reproducible findings.
- Only report risks tied to candidate behavior and gate policy.
- Never claim a defect without evidence and repro steps.

## Output

- Prioritized findings with repro steps.
- Structured `AdversaryReport` JSON.
- Clear merge-block recommendation.

## Completion behavior

Always end with:

- `block_merge` decision
- top 1-3 high-confidence findings with repro pointers
- explicit recommendation (`proceed`, `conditional_pass`, or `block`)
