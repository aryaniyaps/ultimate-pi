# ADR 0057: Fast steer completion (split verdict, hygiene, burst)

- **Status:** Accepted
- **Date:** 2026-06-07
- **Amends:** [0044](0044-harness-steer-loop.md), [0039](0039-harness-post-run-review-gate.md)

## Context

Post-run review could deadlock when eval passed but adversary blocked merge: routing treated eval pass as success while adversary demanded repair. Hygiene failures (lint/format) consumed full executor steer attempts. Phase 1 shell in `/harness-review` raced evaluator spawns without a freshness gate. Lite-review adversary skip trusted session `last_outcome` instead of disk `block_merge`.

## Decision

### P0 — Foundation

1. **`synthesizeReviewOutcome`** — Canonical merge of eval + adversary (+ benchmark). Split fields: `eval_status`, `adversary_status`, `gap_kind`. Eval pass + adversary `block_merge` → `implementation_gap` (not pass).
2. **Disk-backed precheck** — `priorBlockMergeFromDisk` reads `artifacts/adversary-report.yaml` and `review-outcome.yaml`; lite skip only when repro pack passed (`benchmark-log.adversary_repro: pass`).
3. **Phase 1 preflight** — `harness-review-preflight.mjs` hard-gates evaluator spawns; `review-integrity` allowlists Phase 1 bash scripts in the review session.
4. **Hygiene at steer start (Option A)** — `gap_kind: hygiene` runs `harness-steer-hygiene.mjs` at `/harness-steer` entry; increments `hygiene_repairs` only (not `steer_attempt`).

### P1 — Repair brief

5. **`repair-brief` 1.1.0** — `repro_commands`, `repro_skipped`, `verification_commands`, `must_pass_before_handoff`, `gap_kind`.
6. **Executor repro gate** — Run `repro_commands` before handoff when `must_pass_before_handoff: true`.

### P2 — Burst + defer inline repair

7. **No fused executor inside `/harness-review`** — Use `/harness-steer --burst` with `harness-inline-repair.mjs` preflight.
8. **`HARNESS_STEER_BURST` default 0** — Burst allowed only when eval pass + adversary `block_merge` on disk; `effectiveSteerMaxAttempts = base + 1` when burst allowed.
9. **`harness-adversary-repro-pack.mjs`** — Freshness guard before lite adversary skip.

## Consequences

### Positive

- Split-verdict runs route to steer/burst instead of false pass.
- Hygiene repairs are cheap and do not burn steer attempts.
- Review Phase 1 cannot spawn evaluators on stale benchmark logs.

### Negative

- More scripts and schema fields to keep in sync (mitigated by `harness-verify`).

## References

- `.pi/lib/harness-remediation.ts`, `.pi/lib/harness-subagent-precheck.ts`
- `.pi/scripts/harness-review-preflight.mjs`, `harness-steer-hygiene.mjs`, `harness-inline-repair.mjs`, `harness-adversary-repro-pack.mjs`
- `.pi/prompts/harness-review.md`, `harness-steer.md`
- ADR 0044 (steer loop)
