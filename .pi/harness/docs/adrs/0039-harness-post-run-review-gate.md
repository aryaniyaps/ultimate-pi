# ADR 0039: Post-run review gate (`/harness-review`)

- **Status:** Accepted
- **Date:** 2026-05-23

## Context

Post-run flow split across `/harness-eval`, a thin `/harness-review` (verdict-only), and `/harness-critic`. Cross-session resume left `owner_pi_session_id` on the plan session, blocking parent orchestration. Status routing used session handoff strings instead of canonical `artifacts/eval-verdict.yaml`. Prompts still instructed parent JSON parsing and `write` to eval artifacts (ADR 0037 violation).

## Decision

1. **`/harness-review`** is the **master post-run orchestrator** (plan-grade): deterministic gates → benchmark evaluator → policy verdict → adversary (parallel with verdict when precheck allows) → optional tie-breaker → **`artifacts/review-outcome.yaml`**. Always complete review before replan; blocked execute routes here, not `/harness-plan`. `--quick` skips adversary and tie-breaker. Steer attempts 2+ may use **lite** review (benchmark + verdict; skip adversary unless prior `block_merge`).
2. **`/harness-eval`** and **`/harness-critic`** are **deprecated aliases** that forward to `/harness-review` in the same turn.
3. **Ownership:** `/harness-use-run --claim` and auto-claim on post-run commands (unless `--readonly`) set `owner_pi_session_id` and `pi_session_id` to the current Pi session.
4. **Disk truth:** `resolveCompletionStatuses` reads `artifacts/eval-verdict.yaml` and `artifacts/adversary-report.yaml` for `nextStepAfterOutcome` and widget next steps. Persisted `next_recommended_command` on `run-context.yaml` wins when set.
5. **Artifacts:** Evaluator uses `submit_eval_verdict`; adversary uses `submit_adversary_report`. Parent gates with `harness_artifact_ready` only. Parent may write `artifacts/benchmark-log.yaml` via `write_harness_yaml`; parent must not write eval/adversary verdict YAML.
6. **Rollback:** `submit_executor_handoff` mirrors `rollback_refs` to `artifacts/executor-rollback.yaml` (no `artifacts/*.json`).

## Phases (orchestrator)

| Phase | Actor | Output |
|-------|--------|--------|
| 0 | Parent | Parse args; claim run; require execute complete |
| 1 | Parent | `harness-verify.mjs`; optional `benchmark-log.yaml` |
| 2 | `harness/evaluator` benchmark | `eval-verdict.yaml` |
| 2b | Parent | Record benchmark fail in review-outcome; continue to verdict unless harness-verify hard-stops |
| 3 | `harness/evaluator` verdict | `eval-verdict.yaml` (policy) |
| 4 | `harness/adversary` | `adversary-report.yaml` |
| 5 | `harness/tie-breaker` | conditional |

## Consequences

### Positive

- One command after `/harness-run`; same-session and cross-session resume with `--claim`.
- Widget and run context align with on-disk verdicts.

### Negative

- Full post-run pipeline latency is sequential in one command (acceptable vs broken multi-session flow).

## References

- ADR 0032 (amended), ADR 0037
- `.pi/prompts/harness-review.md`
- `.pi/lib/harness-run-context.ts` (`claimRunOwnership`, `resolveCompletionStatuses`)
- `.agents/skills/harness-review/SKILL.md`
