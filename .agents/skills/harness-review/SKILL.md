---
name: harness-review
description: >-
  Post-run verification gate (/harness-review): harness-verify, Sentrux fitness
  functions, benchmark + verdict evaluator, adversary, optional tie-breaker.
  Subagents use submit_*; parent uses harness_artifact_ready. Use after
  /harness-run; claim cross-session runs with /harness-use-run --claim.
---

# harness-review

**Practice map:** `.pi/harness/docs/practice-map.md` (Monitoring and Controlling: measure → judge → red team).

## When to use

- After `/harness-run` completes (same session preferred)
- Resuming with `/harness-use-run <run-id> --claim` then `/harness-review`
- Instead of separate `/harness-eval`, `/harness-critic` (aliases forward here)

## Orchestration summary

| Phase | Practice | Actor | Artifact |
|-------|----------|-------|----------|
| 1 | Automated QC + Sentrux fitness functions | Parent | `harness-verify.mjs`, `harness-sentrux-cli.mjs gate`, `benchmark-log.yaml`, `sentrux-signal.yaml` |
| 2 | Measure actuals (EVM) | `harness/reviewing/evaluator` benchmark | `eval-verdict.yaml` |
| 2b | Controlling | Parent | Write `review-outcome.yaml`; route via `remediation_class` (not fail-fast abort) |
| 6 | Outcome | Parent | `review-outcome.yaml` → `/harness-steer` or replan |
| 3 | Policy audit | `harness/reviewing/evaluator` verdict | same YAML |
| 4 | Red team | `harness/reviewing/adversary` | `adversary-report.yaml` |
| 5 | Arbitration | `harness/reviewing/tie-breaker` | only if block + conditional_pass |

## Phase 1 — Sentrux (structural actuals)

When `HARNESS_SENTRUX_REQUIRED=true` (default in `.env.example`):

1. `node "$UP_PKG/.pi/scripts/harness-verify.mjs"` — rules drift + Sentrux check when CLI installed.
2. `node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" gate` — compare to baseline saved during `/harness-run`.
3. Write `artifacts/sentrux-signal.yaml` and append session entry `harness-sentrux-signal` (observation bus / PostHog).
4. Optional `artifacts/benchmark-log.yaml` fields: `sentrux_check`, `sentrux_gate`, `harness_verify`.

Pass `sentrux-signal.yaml` path to evaluator `mode: benchmark` spawn context. Evaluator treats metrics as measured facts, not goals for the executor.

## Rules

- Parent never writes eval/adversary YAML — subprocess `submit_*` only (ADR 0037).
- Auto-claim run ownership unless `--readonly`.
- Disk verdict drives `next_recommended_command` (`resolveCompletionStatuses`).

## Aliases

- `/harness-eval` → use `/harness-review`
- `/harness-critic` → use `/harness-review` (or `--quick` to skip adversary)
