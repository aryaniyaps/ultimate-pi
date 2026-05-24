---
name: requirements-to-implementation
description: Translate vague or high-level requests into safe implementation steps. Use before coding features, bug fixes, refactors, or ambiguous tasks. Extracts requirements, constraints, done criteria, non-goals, risk, and the smallest viable implementation path.
---

# Requirements to Implementation

Use this skill to prevent solving the wrong problem.

## Workflow

1. Restate the user objective in concrete behavior terms.
2. Separate explicit requirements from assumptions.
3. Inspect repo conventions and relevant existing behavior before choosing an approach.
4. Identify constraints: compatibility, data, security, performance, architecture, tests, and delivery risk.
5. Define done criteria and non-goals.
6. Pick the smallest implementation path that satisfies the request.
7. Ask the user when scope, risk, destructive action, or irreversible behavior is ambiguous.

## Implementation prompt

Before editing, answer:

- What behavior changes?
- What behavior must not change?
- Which files/contracts are likely affected?
- What verification proves completion?
- What would be overreach?

## Avoid

- Treating examples as exhaustive requirements without checking.
- Inventing product behavior not requested or present in code.
- Starting with a broad redesign when a local change suffices.
