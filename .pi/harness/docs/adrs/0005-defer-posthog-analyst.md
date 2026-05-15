# ADR 0005: Defer PostHog analyst skill

- **Status:** Accepted (deferred to Phase 3+)
- **Date:** 2026-05-15

## Context

The `posthog-analyst` skill queries `$ai_*` events today. Phase 2 adds `harness_*` events but not automated analyst runs.

## Decision

**Do not invoke** `posthog-analyst` as part of Phase 2 implementation or CI.

Extend the skill in Phase 3+ to query `harness_*` after ≥20 full runs with harness events in PostHog.

Phase 2 builds **data** (harness telemetry + JSONL); humans use PostHog Live Events and ADR 0008 HogQL examples.

## Consequences

### Positive

- Avoids analyst skill cost/noise before harness dashboards exist.

### Negative

- Team must manually inspect PostHog until Phase 3+.

## References

- `.agents/skills/posthog-analyst/SKILL.md`
- ADR 0008
