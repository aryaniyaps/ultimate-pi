# ADR 0007: Interactive drift monitor

- **Status:** Accepted
- **Date:** 2026-05-15

## Context

Agents can diverge from an approved plan mid-run. Silent continuation erodes trust.

## Decision

1. `drift-monitor.ts` tracks `baseline_plan_id` vs current policy `planId`.
2. When `drift_score >= HARNESS_DRIFT_THRESHOLD` (default 0.65), block with interactive prompt until user:
   - **Replan:** `harness-drift-replan` or `/harness-plan`
   - **Proceed:** `harness-drift-proceed` with explicit acknowledgment
3. Emit `harness-drift-report` custom entries → `harness_drift_report` PostHog events.

## Consequences

### Positive

- Human-in-the-loop for high drift; auditable ack in session entries.

### Negative

- Heuristic drift score until Spec Distiller / plan diff integration matures.

## References

- `.pi/extensions/drift-monitor.ts`
