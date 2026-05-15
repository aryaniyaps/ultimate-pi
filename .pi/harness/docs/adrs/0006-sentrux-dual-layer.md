# ADR 0006: Sentrux dual-layer trust

- **Status:** Accepted
- **Date:** 2026-05-15

## Context

Evaluator trust requires both programmatic gates (policy, budget, integrity) and external observation signals (Sentrux MCP).

## Decision

1. **Rules file:** `.sentrux/rules.toml` synced from manifest — see [ADR 0009](0009-sentrux-rules-lifecycle.md).
2. **CLI gate:** `npm run harness:verify` fails if `HARNESS_SENTRUX_REQUIRED=true` and no `harness-sentrux-signal` stub/file exists for the run (placeholder until MCP wired).
3. **MCP layer (Q2+):** Evaluator sessions must record at least one Sentrux observation before `harness_eval_verdict` promotion when Sentrux is enabled.
4. Observations flow through `observation-bus.ts` as `HarnessObservation` envelopes.
5. PostHog event: `harness_sentrux_signal` with `signal_type` and `score` only — no secrets.

## Consequences

### Positive

- Clear extension point for Sentrux without blocking Phase 2 scaffolding.

### Negative

- Full MCP integration remains follow-up when Sentrux server is available.

## References

- `.pi/harness/specs/observation.schema.json`
- `.pi/scripts/harness-verify.mjs`
