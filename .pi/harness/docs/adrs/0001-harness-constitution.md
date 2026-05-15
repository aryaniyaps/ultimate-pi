# ADR 0001: Harness constitution

- **Status:** Accepted
- **Date:** 2026-05-15

## Context

ultimate-pi needs a stable governance model for agentic runs: plan-before-mutate, phase enforcement, independent review, and measurable outcomes without forking pi-mono.

## Decision

1. Harness governance is implemented as **repo-owned Pi extensions** under `.pi/extensions/`, not upstream forks.
2. Phases are `plan → execute → evaluate → adversary → merge` with policy-gate as the source of truth.
3. Local JSONL under `.pi/harness/runs/` is the **source of truth** for run history; PostHog is for team dashboards.
4. Context for harness paths uses **context-mode only** — never lean-ctx in harness skills or extensions.
5. `@posthog/pi` remains the LLM analytics layer; harness domain events use `harness-telemetry.ts`.

## Consequences

### Positive

- Clear separation between upstream pi analytics and harness semantics.
- Reproducible local traces for meta-optimizer and self-healing.

### Negative

- Two PostHog event families require join-by-time or `harness_run_id` in dashboards.

## References

- `.pi/extensions/policy-gate.ts`
- `.pi/harness/README.md`
