# ADR 0008: Harness PostHog telemetry

- **Status:** Accepted
- **Date:** 2026-05-15

## Context

`@posthog/pi` emits `$ai_generation`, `$ai_span`, and `$ai_trace` only. Harness KPIs need domain events without forking upstream.

## Decision

1. **Extension:** `.pi/extensions/harness-telemetry.ts` using `posthog-node`, same `POSTHOG_API_KEY` / `POSTHOG_HOST`.
2. **Kill switch:** `HARNESS_TELEMETRY_ENABLED=false` disables harness captures only.
3. **Privacy:** `POSTHOG_PRIVACY_MODE=true` strips paths from harness properties (counts/enums only).
4. **Emission:** Scan session custom entries on `agent_end`; dedupe by content hash. `harness_run_started` from `trace-recorder` on `agent_start`.
5. **Correlation:** Primary join key `harness_run_id`; secondary `pi_session_id` + time window with `$ai_*` events.

## Event catalog

| Event | Trigger |
|-------|---------|
| `harness_run_started` | trace-recorder `agent_start` |
| `harness_run_completed` | `harness-run-record` on `agent_end` flush |
| `harness_phase_transition` | policy phase change |
| `harness_policy_violation` | policy-gate violation |
| `harness_policy_abort` | harness-abort |
| `harness_budget_soft_limit` | budget-guard soft limit |
| `harness_budget_exhausted` | budget exhausted |
| `harness_review_integrity_block` | review-integrity block |
| `harness_test_integrity_flag` | test-diff-integrity |
| `harness_debate_round` | debate envelope round |
| `harness_debate_consensus` | consensus packet |
| `harness_drift_report` | drift-monitor |
| `harness_eval_verdict` | evaluator |
| `harness_sentrux_signal` | Sentrux MCP / stub |

Schema: `.pi/harness/specs/harness-posthog-event.schema.json`

## Dashboard seed (manual setup in PostHog UI)

Create saved insights in project `ultimate-pi`:

1. **Harness runs / day** — Trends, event `harness_run_completed`, count.
2. **Policy violations** — Trends, `harness_policy_violation`, breakdown by `violation_type`.
3. **Budget exhaust rate** — Formula: `harness_budget_exhausted` / `harness_run_completed`.
4. **Mean tokens per run** — `harness_run_completed`, aggregate `input_tokens + output_tokens`.

### Example HogQL

```sql
SELECT
  properties.harness_run_id,
  properties.harness_phase,
  properties.duration_ms,
  properties.input_tokens,
  properties.output_tokens
FROM events
WHERE event = 'harness_run_completed'
  AND timestamp > now() - INTERVAL 7 DAY
ORDER BY timestamp DESC
LIMIT 100
```

Funnel (Live → Insights → Funnels):

1. `harness_run_started`
2. `harness_run_completed`
3. `harness_eval_verdict` (optional)

## Manual verification

1. Set `POSTHOG_API_KEY`, `POSTHOG_PROJECT_NAME=ultimate-pi`.
2. Run a pi session with `/harness-auto "smoke task"`.
3. Open PostHog → Live Events → filter `event like harness_%`.
4. Confirm `harness_run_started` and `harness_run_completed` share the same `harness_run_id`.

## Consequences

### Positive

- Team dashboards without upstream fork.

### Negative

- Dashboards are manual until Phase 3 analyst skill extension.

## References

- `.pi/extensions/harness-telemetry.ts`
- `.pi/extensions/lib/harness-posthog.ts`
