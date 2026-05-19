# ADR 0038: Budget enforcement telemetry-only (default)

**Status:** Accepted  
**Date:** 2026-05-19

## Context

Token and debate caps emitted `harness-budget-exhausted`, which set `budgetExhausted` in the live widget and blocked flows even when `HARNESS_BUDGET_HARD_STOP` was false. `max_rounds` and messenger exchange limits in `validatePlanDebateGate` also hard-failed approval.

## Decision

- **`HARNESS_BUDGET_ENFORCE` default `off`:** phase/debate caps log `harness-budget-soft-limit` and `harness-budget-telemetry` only; `harness-budget-exhausted` is emitted only when enforce is on **and** hard-stop flags are set.
- **UI:** `budgetExhausted` / blocked substate only when blocking exhaustion events qualify.
- **Debate:** `capsForDebate` uses sentinel caps when enforce is off; `max_rounds` gate errors become warnings.
- **CLI:** `--budget` on harness prompts is reserved/no-op until a real budget story ships.

Re-enable: `HARNESS_BUDGET_ENFORCE=1` plus `HARNESS_BUDGET_HARD_STOP` / `HARNESS_DEBATE_HARD_STOP` as needed.

## Consequences

- Long debates and large plans are not blocked by soft token telemetry.
- Quality gates (`min_focus_rounds`, required focuses, `review_gate_ready`) remain enforced.
- PostHog should prefer `harness_budget_telemetry` over exhausted for dashboards until enforce returns.
