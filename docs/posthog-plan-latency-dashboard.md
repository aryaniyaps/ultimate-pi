# PostHog — harness plan latency dashboard

Use project **Default Project** (or your harness project). Correlate runs with `pi_session_id` on `$ai_generation` and harness custom events.

## Event properties (after telemetry-first)

| Event | Key properties |
|-------|----------------|
| `harness_subagent_spawned` | `run_id`, `harness_run_id`, `harness_plan_id`, `harness_phase`, `agent_ids[]`, `spawn_group_id`, `agent_count` |
| `harness_subagent_completed` | same + `duration_ms`, `mode` |
| `harness_debate_round` | `run_id`, `debate_id`, `round_index`, `event` |
| `harness_run_started` | `run_id`, `harness_run_id`, `phase` |

## HogQL — plan phase wall clock (session)

```sql
SELECT
  properties.pi_session_id AS session_id,
  min(timestamp) AS plan_start,
  max(timestamp) AS plan_end,
  dateDiff('second', min(timestamp), max(timestamp)) AS wall_seconds
FROM events
WHERE event IN ('harness_run_started', 'harness_subagent_completed', 'harness_debate_round')
  AND timestamp > now() - INTERVAL 7 DAY
GROUP BY session_id
ORDER BY wall_seconds DESC
LIMIT 50
```

## HogQL — subagent time by agent id

```sql
SELECT
  arrayJoin(JSONExtract(properties, 'agent_ids', 'Array(String)')) AS agent_id,
  sum(toFloat(properties.duration_ms)) / 1000 AS total_seconds,
  count() AS batches
FROM events
WHERE event = 'harness_subagent_completed'
  AND timestamp > now() - INTERVAL 7 DAY
GROUP BY agent_id
ORDER BY total_seconds DESC
```

## HogQL — debate round count per run

```sql
SELECT
  properties.run_id AS run_id,
  countIf(properties.event = 'open') AS opens,
  countIf(properties.round_index IS NOT NULL) AS round_events
FROM events
WHERE event = 'harness_debate_round'
  AND timestamp > now() - INTERVAL 7 DAY
GROUP BY run_id
ORDER BY round_events DESC
```

## Targets (fast profile)

- Med-risk non-fork plans: **≤5 min** plan phase wall clock
- Review Gate: **1** consolidated round when `debate_profile=fast`
- Subagent batches: `agent_ids` populated on every spawn/complete event
