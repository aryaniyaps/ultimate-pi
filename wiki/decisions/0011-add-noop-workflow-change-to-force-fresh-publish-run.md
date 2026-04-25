# 0011 - Add noop workflow change to force fresh publish run

- Date: 2026-04-25
- Status: Accepted

## Context
User requested a fresh commit and publish attempt because rerun signal looked stale.
Current publish workflow logic already targeted for Trusted Publishing.

## Alternatives
1. Keep rerunning same workflow execution.
2. Make a functional workflow change.
3. Make a minimal non-functional workflow change and trigger new run from new commit.

## Chosen option
Add a non-functional workflow metadata field (run-name) and push a new commit.

## Rationale
- Produces clean new run context tied to fresh commit SHA.
- Avoids unnecessary behavior changes.
- Smallest viable diff.

## Consequences
- No runtime behavior change expected.
- Still depends on npm auth configuration correctness.
