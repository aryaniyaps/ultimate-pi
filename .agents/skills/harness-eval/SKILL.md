---
name: harness-eval
description: Run harness evaluation phase and emit EvalVerdict artifacts. Use with /harness-eval, evaluate phase, or before merge promotion.
---

# harness-eval

## When to use

- `/harness-eval` after execute
- Before merge / release readiness

## Workflow (orchestrator)

1. Parent may run deterministic scripts (`harness-verify`, project tests).
2. Spawn `harness/evaluator` with `mode: benchmark` and artifact paths in `HarnessSpawnContext`.
3. Parse JSON from `get_subagent_result`; parent writes run artifacts.

## Rules

- No new Pi session — subagent isolation via `Agent` spawn (ADR 0032).
- Do not edit `plan-packet.json` in eval phase.
- `/harness-review` uses same agent with `mode: verdict` for policy EvalVerdict.

## Verdict values

`pass`, `conditional_pass`, `fail`, `human_required` (parent handles `ask_user`).
