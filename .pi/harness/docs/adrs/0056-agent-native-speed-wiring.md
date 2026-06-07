# ADR 0056: Agent-native speed wiring (v0.25.0)

Status: Accepted  
Date: 2026-06-06

## Context

ADR 0042 documented agent-native orchestration (parallel probes, synthesizer path, FSM). v0.24.0 shipped latency infrastructure but runtime wiring remained meeting-shaped: `harness_debate_open` ignored `parallel_probes`, gates fell back to threaded mode, and parents re-reasoned every turn.

## Decision

1. **parallel_probes end-to-end** — `review_gate_mode` includes `parallel_probes`; eligibility snapshot at `artifacts/plan-debate-eligibility.yaml`; `effectiveMinFocusRounds` caps bus checks to 1; focus coverage parses `review-round-parallel-probes.yaml`.
2. **SSOT routing** — `planReviewGateModeForProfile`: fast→consolidated, standard→parallel_probes, light/full→threaded.
3. **plan-synthesizer default** — low/med route via `harness_plan_route`; readiness waives separate decompose/hypothesis when all three synthesizer artifacts exist.
4. **Auto-approve** — `HARNESS_PLAN_AUTO_APPROVE` with `canAutoApprovePlan` / audit artifact; requires non-interactive or `force`.
5. **Plan FSM** — `derivePlanNextAction` + `harness_plan_next_action` tool.
6. **Spawn budget enforce** — per-phase caps when `HARNESS_BUDGET_ENFORCE=1` (plan 12, execute 3, evaluate 6).
7. **Review parallel default** — evaluator∥adversary on by default unless `HARNESS_REVIEW_PARALLEL=0`, `--quick`, or steer_attempt ≥ 2.
8. **Auto-compact 50%** — `harness-auto-compact` extension with hysteresis; subagent compact off by default.
9. **Phase worker spike** — `HARNESS_PHASE_WORKER=1` env only; no cross evaluator/adversary resume.

## Consequences

- Med-risk plans complete Review Gate in ≤4 debate spawns (validator, parallel evaluator∥adversary, integrator, submit).
- `HARNESS_REVIEW_PARALLEL=0` remains CI escape hatch.
- Amend ADR 0030 for 50% harness compact gate.
