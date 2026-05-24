---
name: code-review-self-check
description: Perform a final agent self-review before reporting completion. Use after any code edit, refactor, test change, config change, or docs update. Checks diff scope, behavior alignment, edge cases, tests, security/privacy, naming, and unverified risks.
---

# Code Review Self-Check

Use this skill before final response on code-writing tasks.

## Review workflow

1. Inspect the diff, not just memory of edits.
2. Re-read the original request and compare it to changed behavior.
3. Check that no unrelated files or formatting churn were introduced.
4. Check public contracts, data formats, and error behavior.
5. Check edge cases and failure paths.
6. Check names and structure against nearby conventions.
7. Check tests: they should assert behavior that matters and fail for the old bug/change when applicable.
8. Check logs/errors for secret or private data exposure.
9. Run or explain the most relevant verification.
10. Report residual risk honestly.

## Final response fields

- changed files
- why changed
- verification run
- known risks or follow-ups

## Red flags

- The implementation is larger than the request.
- Tests only assert mocks or snapshots without behavior.
- The code handles success but not failure.
- A new dependency or contract change is unexplained.
