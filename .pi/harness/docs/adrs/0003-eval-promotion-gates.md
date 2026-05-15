# ADR 0003: Eval promotion gates

- **Status:** Accepted
- **Date:** 2026-05-15

## Context

Harness promotion (router tuning, release readiness) must not rely on flaky or unaudited eval signals.

## Decision

1. Eval verdicts conform to `eval-verdict.schema.json` and emit `harness_eval_verdict` PostHog events.
2. Deterministic smoke fixtures under `.pi/harness/evals/smoke/` run in CI **without LLM calls**.
3. Promotion requires: eval pass, no active policy abort, debate consensus when adversary triggered, and Sentrux gate when enabled (see ADR 0006).
4. Human override allows a single approver with mandatory justification (incident record).

## Consequences

### Positive

- CI validates contracts cheaply; full agent eval stays manual until Phase 3+.

### Negative

- Live harness quality still depends on manual `/harness-auto` runs for signal.

## References

- `.pi/harness/specs/eval-verdict.schema.json`
- `.pi/harness/evals/smoke/`
