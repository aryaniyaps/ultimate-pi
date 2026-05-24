---
name: risk-based-verification
description: Match verification depth to change risk. Use after code, test, config, dependency, data, or docs changes. Helps agents choose targeted checks for low risk, broader checks for medium/high risk, and report unverified residual risk clearly.
---

# Risk-Based Verification

Use this skill to verify enough without wasting effort or claiming false confidence.

## Risk levels

Low risk:
- small local change
- no public contract or data change
- existing tests cover area
- reversible

Medium risk:
- multiple files or boundaries
- new branch/error path
- test coverage uncertain
- behavior visible to users or other modules

High risk:
- data migration or destructive operation
- security/privacy/auth change
- dependency/runtime upgrade
- concurrency/distributed behavior
- public contract or compatibility change

## Verification choices

- Low: targeted unit test, focused lint/type/build check, or direct script/example.
- Medium: affected test suite, integration/contract check, diff review, edge-case tests.
- High: broad test suite, migration/rollback validation, security review, performance check, manual approval when needed.

## Final report

Always state:

- checks run
- checks not run
- why verification is sufficient or what risk remains
