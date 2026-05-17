---
name: harness-orchestration
description: >-
  Orchestrate ultimate-pi harness phases with Agent spawns, blackboard handoffs,
  and observation-bus artifacts. Use for plan/execute/evaluate pipelines, L4
  verification, parallel scouts, and debate prep.
---

# Harness orchestration

## Slash commands = orchestrators

`/harness-*` prompts parse args, spawn agents, run `ask_user`, write policy-gated artifacts. Phase logic lives in `.pi/agents/harness/*.md`.

Every spawn includes **HarnessSpawnContext** JSON (subagents do not get `[HarnessActivePlan]` injection). Use `inherit_context: false`.

## Command → agent

| Command | `subagent_type` |
|---------|-----------------|
| `/harness-plan` | `harness/planner` |
| `/harness-run` | `harness/executor` |
| `/harness-eval` | `harness/evaluator` (`mode: benchmark`) |
| `/harness-review` | `harness/evaluator` (`mode: verdict`) |
| `/harness-critic` | `harness/adversary` |
| `/harness-trace` | `harness/trace-librarian` |
| `/harness-incident` | `harness/incident-recorder` |
| `/harness-router-tune` | `harness/meta-optimizer` (optional) |
| `/harness-auto` | sequential spawns above |

## Review isolation

Spawn `harness/evaluator` / `harness/adversary` in the **same** parent session — isolated subagent context replaces session fork (ADR 0032).

## ask_user policy

| Agent | `ask_user` |
|-------|------------|
| Parent orchestrator | Yes (approval, clarification, router tune) |
| `harness/planner` | No — returns `clarification` in JSON |
| `harness/evaluator`, `harness/adversary`, `harness/tie-breaker` | No — `human_required` in output |
| `harness/executor` | No — parent handles governance |

## Spawn pattern

```
Agent({ subagent_type: "harness/planner", prompt: "<task + HarnessSpawnContext JSON>" })
get_subagent_result
```

## Tools

- `Agent`, `get_subagent_result`, `steer_subagent`
- `blackboard` — parent only
- Subagents cannot nest spawns

## References

- ADR 0032, `.pi/harness/specs/harness-spawn-context.schema.json`
- `node "$UP_PKG/.pi/scripts/harness-agents-manifest.mjs" --check`
