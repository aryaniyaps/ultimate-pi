---
description: Post-review repair pass — executor reads repair-brief.yaml, then re-verify via /harness-review.
argument-hint: "[--attempt N]"
---

# harness-steer

Thin orchestrator for the **steer loop** (ADR 0044). Run only after `/harness-review` produced `artifacts/review-outcome.yaml` and `artifacts/repair-brief.yaml` with `remediation_class: implementation_gap`.

## Preconditions

- Active run with `plan_ready` and `plan_packet_path`
- `review-outcome.remediation_class` is `implementation_gap` (review outcome wins over executor `scope_drift` for routing)
- `steer_attempt < HARNESS_STEER_MAX_ATTEMPTS` (default 3)

## Steps

1. Read `artifacts/review-outcome.yaml`, `artifacts/repair-brief.yaml`, `plan_packet_path` (paths only — do not paste bodies into tool args).
2. Update `artifacts/steer-state.yaml` (`attempt`, `max_attempts`, `active: true`).
3. Set policy phase to **execute** before spawning executor (required for mutating tools).
4. One `ask_user` steer gate unless `run-context.steer_approved` is already true.
5. Spawn **`harness/running/executor`** with `HarnessSpawnContext.mode: repair` and `repair_brief_path: artifacts/repair-brief.yaml`.
6. Optional: `node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" gate --save` after repair to refresh baseline (ADR 0044).
7. `next_command`: **`/harness-review`** (always re-verify; tiered adversary on attempts 2+ per practice-map).

## Forbidden

- Re-call `approve_plan` unless `plan-packet.yaml` structure changed
- Widen scope beyond approved packet
- Skip review after repair
