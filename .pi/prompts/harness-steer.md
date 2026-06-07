---
description: Post-review repair pass — executor reads repair-brief.yaml, then re-verify via /harness-review.
argument-hint: "[--burst] [--attempt N]"
---

# harness-steer

Thin orchestrator for the **steer loop**. Run only after `/harness-review` produced `artifacts/review-outcome.yaml` and `artifacts/repair-brief.yaml` with `remediation_class: implementation_gap`.

## Preconditions

- Active run with `plan_ready` and `plan_packet_path`
- `review-outcome.remediation_class` is `implementation_gap` (review outcome wins over executor `scope_drift` for routing)
- `steer_attempt < effective max` from `artifacts/steer-state.yaml` (default `HARNESS_STEER_MAX_ATTEMPTS=3`; +1 when burst allowed)

## Steps

1. Read `artifacts/review-outcome.yaml`, `artifacts/repair-brief.yaml`, `artifacts/steer-state.yaml`, `plan_packet_path` (paths only — do not paste bodies into tool args). When present, `repair-brief.yaml` already merges `artifacts/sentrux-repair-plan.yaml` (`[sentrux:…]` directives).
2. Extension updates `steer-state.yaml` on entry (`attempt`, `hygiene_repairs`, `burst_used`). **Hygiene-only** (`gap_kind: hygiene`) increments `hygiene_repairs` only — not `attempt`.
3. **Hygiene fast-path** (`gap_kind: hygiene` or `mixed` with hygiene directives first):

```bash
node "$UP_PKG/.pi/scripts/harness-steer-hygiene.mjs" --run-dir "<run_dir>" --project-root "<project_root>"
```

Do **not** spawn executor for hygiene-only gaps. Then `next_command`: `/harness-review`.

4. **Burst** (`--burst` + `HARNESS_STEER_BURST=1`): preflight before executor:

```bash
node "$UP_PKG/.pi/scripts/harness-inline-repair.mjs" --run-dir "<run_dir>"
```

Requires eval `pass` + adversary `block_merge` on disk. Sets `inline_repair_attempted` on run-context.

5. Set policy phase to **execute** before spawning executor (required for mutating tools).
6. One `ask_user` steer gate unless `run-context.steer_approved` is already true.
7. Spawn **`harness/running/executor`** with `HarnessSpawnContext.mode: repair` and `repair_brief_path: artifacts/repair-brief.yaml`. Run `repair-brief.repro_commands` (or `verification_commands`) before handoff when `must_pass_before_handoff: true`.
8. Optional: `node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" gate --save` after repair.
9. Optional: `node "$UP_PKG/.pi/scripts/harness-ls-lint-cli.mjs"` after repair.
10. `next_command`: **`/harness-review`** (always re-verify; lite review on attempts 2+ unless prior `block_merge`).

## Forbidden

- Re-call `approve_plan` unless `plan-packet.yaml` structure changed
- Widen scope beyond approved packet
- Skip review after repair
- Broad `git add` during hygiene (script uses path allowlist)
