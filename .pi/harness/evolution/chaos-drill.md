# Harness chaos drill (manual)

Run quarterly or before major harness releases. **No automation in Phase 2.**

## Preconditions

- `POSTHOG_API_KEY` set; Live Events open
- Local `.pi/harness/runs/` writable

## Scenarios

1. **Policy abort mid-run** — `/harness-abort` then attempt `write`; expect block + `harness_policy_abort`.
2. **Budget soft limit** — Lower `HARNESS_BUDGET_EXECUTE_TOKENS` to `5000`, run `/harness-run`; expect `harness_budget_soft_limit`.
3. **Review integrity** — Stay in `evaluate` phase same session as execute; expect `harness_review_integrity_block`.
4. **Drift gate** — Change plan id mid-run; expect interactive drift message + `harness_drift_report` after threshold.
5. **Trace completeness** — One `/harness-auto` task; verify `trace.json` + `harness_run_completed` share `harness_run_id`.

## Pass criteria

- All five scenarios produce expected custom entries and matching `harness_*` PostHog events within 60s.
- `npm run harness:verify` still passes after drill.

## Rollback

- Clear test runs under `.pi/harness/runs/` if needed (keep `index.jsonl` backup).
- Set `HARNESS_TELEMETRY_ENABLED=false` to silence PostHog during drills.
