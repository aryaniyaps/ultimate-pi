# ADR 0006: Sentrux dual-layer trust

- **Status:** Accepted
- **Date:** 2026-05-15

## Context

Evaluator trust requires both programmatic gates (policy, budget, integrity) and **measured structural actuals** from the Sentrux CLI (Pi sessions use CLI only — no Sentrux MCP in harness).

## Decision

1. **Rules file:** `.sentrux/rules.toml` synced from manifest — see [ADR 0009](0009-sentrux-rules-lifecycle.md).
2. **Run observation:** `/harness-run` writes `artifacts/sentrux-signal.yaml` and appends session custom entry `harness-sentrux-signal` after root-resolved Sentrux `check` + `gate` via `harness-sentrux-cli.mjs` (baseline from `gate --save` before execute). Raw `sentrux check .` / `gate .` must not be used from `.pi/harness/runs/*` because Sentrux resolves `.sentrux/rules.toml` against the path argument.
3. **Verify gate:** `harness-verify.mjs` with `HARNESS_SENTRUX_REQUIRED=true` prefers `$HARNESS_RUN_DIR/artifacts/sentrux-signal.yaml`; falls back to `.pi/harness/evals/smoke/sentrux-stub.json` only when no run signal exists (CI smoke / pre-run verify).
4. **Evaluator:** `harness/evaluator` in `benchmark` mode reads `sentrux-signal.yaml` and `benchmark-log.yaml` — metrics are inputs, not executor optimization targets.
5. Observations flow through `observation-bus.ts` as `HarnessObservation` envelopes when wired.
6. PostHog event: `harness_sentrux_signal` with `signal_type` and `score` only — no secrets.

## Consequences

### Positive

- Clear extension point for Sentrux without blocking Phase 2 scaffolding.

### Negative

- Teams must run `/harness-run` (or write `sentrux-signal.yaml`) before promotion verify when stub fallback is insufficient.

## References

- `.pi/harness/specs/observation.schema.json`
- `.pi/scripts/harness-verify.mjs`
- `.pi/scripts/harness-sentrux-cli.mjs`
