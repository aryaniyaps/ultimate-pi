---
name: harness-orchestration
description: >-
  Orchestrate ultimate-pi harness phases with the native `subagent` tool
  (isolated `pi --mode json` subprocesses). Use for plan/execute/evaluate
  pipelines, L4 verification, parallel scouts, and debate prep.
---

# Harness orchestration

## Slash commands = orchestrators

`/harness-*` prompts parse args, call `subagent`, run `ask_user`, write policy-gated artifacts. Phase logic lives in `.pi/agents/harness/*.md` and `.pi/agents/harness/planning/*.md`.

Every spawn includes **HarnessSpawnContext** JSON in the task text (subprocess agents do not get `[HarnessActivePlan]` injection). Use `agentScope: "both"` so package agents under `$UP_PKG/.pi/agents/**` resolve.

## Subprocess telemetry

Harness bridge emits `harness_subagent_spawned` / `harness_subagent_completed` (replaces in-process setup/blackboard events).

```sql
SELECT
  properties.agent as agent,
  count() as n,
  round(avg(toFloat(properties.duration_ms)), 0) as avg_ms
FROM events
WHERE event = 'harness_subagent_completed'
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY agent
ORDER BY avg_ms DESC
LIMIT 30
```

## Latency rules

1. **Parallel `tasks`** — one `subagent({ tasks: [...] })` for scouts, decompose+hypothesis, or review fan-in; subprocesses run in parallel upstream.
2. **Blocking calls** — each `subagent` returns when the subprocess exits; no `get_subagent_result` polling.
3. **Compact handoffs** — pass scout/decompose JSON only; never paste full subprocess message logs into the next spawn.
4. **No spawn cap** — harness subagent spawns are unlimited per session (active count is telemetry only). Do **not** pass `timeoutMs` unless the user wants a cap — subprocesses wait for natural exit (`PI_SUBAGENT_TIMEOUT_MS` optional env backstop only).

## Command → agent

| Command | `agent` |
|---------|---------|
| `/harness-plan` | Parent: scouts → `decompose`+`hypothesis` → Phase 3.5 `implementation-researcher`+`stack-researcher` → PlanPacket → eligibility + Review Gate → `approve_plan` + `create_plan` |
| `/harness-run` | `harness/executor` |
| `/harness-eval` | `harness/evaluator` (`mode: benchmark`) |
| `/harness-review` | `harness/evaluator` (`mode: verdict`) |
| `/harness-critic` | `harness/adversary` (post-run) |
| `/harness-trace` | `harness/trace-librarian` |
| `/harness-incident` | `harness/incident-recorder` |
| `/harness-router-tune` | `harness/meta-optimizer` (optional) |
| `/harness-auto` | plan per `/harness-plan`; `--quick` skips adversary + tie-breaker |

## Review isolation

Spawn `harness/evaluator` / `harness/adversary` via `subagent` in the **same** parent session. `review-integrity` allows `subagent` when `agent` is in the review set; blocks executor from spawning review agents during evaluate.

## ask_user policy

| Role | `ask_user` |
|------|------------|
| Parent orchestrator | Yes (plan clarification, `approve_plan`, router tune) |
| `harness/planning/*` | No — JSON only (`human_required` in output if stuck) |
| `harness/evaluator`, `harness/adversary`, `harness/tie-breaker` | `human_required` in subprocess JSON |
| `harness/executor` | No — parent handles governance |

## Spawn pattern (`/harness-plan`)

```json
{
  "agentScope": "both",
  "tasks": [
    { "agent": "harness/planning/scout-graphify", "task": "…" },
    { "agent": "harness/planning/scout-structure", "task": "…" },
    { "agent": "harness/planning/scout-semantic", "task": "…" }
  ]
}
```

Then parallel decompose + hypothesis, Phase 3.5 implementation + stack research, parent PlanPacket + `ask_user` (after 3.5), execution-plan-author, DAG gate, `harness_plan_debate_eligibility` + debate rounds, then `approve_plan` + `create_plan`.

Scouts use **Haiku**, `thinking: low`, **8** max turns (see agent frontmatter). Effective `--tools` omits `grep`/`find`/`subagent` per `disallowed_tools`.

## Tools

- `subagent` — harness subprocess spawns (modes: `single`, `tasks`, `chain`, `aggregator`)
- `approve_plan`, `create_plan` — parent orchestrator only
- Subprocess agents cannot nest `subagent` (`subagent` stripped from child `--tools`)

## References

- ADR 0032, ADR 0033, `.pi/harness/specs/harness-spawn-context.schema.json`
- `node "$UP_PKG/.pi/scripts/harness-agents-manifest.mjs" --check`
