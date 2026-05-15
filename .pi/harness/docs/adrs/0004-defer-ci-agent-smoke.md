# ADR 0004: Defer CI agent smoke

- **Status:** Accepted (deferred to Phase 3+)
- **Date:** 2026-05-15

## Context

Running full agent smoke or A/B harness comparisons in CI has high token cost and flaky provider dependencies.

## Decision

**Defer** CI agent smoke and CI A/B harness experiments until Phase 3+ after:

1. A documented per-run token cost model exists.
2. Deterministic schema/fixture CI is green for ≥4 weeks.
3. At least 20 manual harness runs with `harness_run_completed` in PostHog.

Phase 2 ships **deterministic** eval fixtures only (`node "$UP_PKG/.pi/scripts/harness-verify.mjs"`; see `.pi/scripts/README.md`).

## Consequences

### Positive

- CI stays fast and provider-agnostic.

### Negative

- Regression detection for agent behavior remains manual in Phase 2.

## References

- Plan todo `deferred-ci-smoke`
- `.pi/harness/evals/smoke/`
