---
name: debugging-discipline
description: Debug systematically instead of guessing. Use when fixing bugs, failing tests, flaky behavior, runtime errors, regressions, or unexpected output. Guides reproduction, isolation, hypotheses, evidence, one-variable changes, root cause, and regression tests.
---

# Debugging Discipline

Use this skill for bug-fix tasks and failing verification.

## Workflow

1. Reproduce or precisely describe the failure.
2. Capture the expected behavior and actual behavior.
3. Identify the smallest failing path or input.
4. Form one hypothesis from evidence.
5. Inspect code/data/logs that can confirm or reject the hypothesis.
6. Change one variable at a time.
7. Fix root cause, not just the visible symptom.
8. Add a regression test or equivalent guard.
9. Re-run the failing check and relevant adjacent checks.

## Evidence to collect

- failing assertion or error
- inputs and state
- recent changes
- boundary/edge conditions
- logs with sensitive data redacted
- dependency/environment differences

## Avoid

- Random edits before reproduction.
- Explaining away failures without evidence.
- Masking errors by broad catch/ignore logic.
- Declaring fixed without rerunning the failing path.
