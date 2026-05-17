---
name: harness-orchestration
description: >-
  Orchestrate ultimate-pi harness phases with Agent spawns, blackboard handoffs,
  and observation-bus artifacts. Use for plan/execute/evaluate pipelines, L4
  verification, parallel scouts, and debate prep.
---

# Harness orchestration

## Slash commands = orchestrators

`/harness-*` prompts parse args, spawn agents, run `ask_user`, write policy-gated artifacts. Phase logic lives in `.pi/agents/harness/*.md` and `.pi/agents/harness/planning/*.md`.

Every spawn includes **HarnessSpawnContext** JSON (subagents do not get `[HarnessActivePlan]` injection). Use `inherit_context: false`.

## Command → agent

| Command | `subagent_type` |
|---------|-----------------|
| `/harness-plan` | Parent: parallel `scout-*` → `decompose` → `hypothesis` → PlanPacket → parallel `plan-adversary` + `hypothesis-eval`; `approve_plan` + `create_plan` |
| `/harness-run` | `harness/executor` |
| `/harness-eval` | `harness/evaluator` (`mode: benchmark`) |
| `/harness-review` | `harness/evaluator` (`mode: verdict`) |
| `/harness-critic` | `harness/adversary` (post-run) |
| `/harness-trace` | `harness/trace-librarian` |
| `/harness-incident` | `harness/incident-recorder` |
| `/harness-router-tune` | `harness/meta-optimizer` (optional) |
| `/harness-auto` | plan phases per `/harness-plan`, then sequential spawns above |

## Review isolation

Spawn `harness/evaluator` / `harness/adversary` in the **same** parent session — isolated subagent context replaces session fork (ADR 0032).

## ask_user policy

| Agent | `ask_user` |
|-------|------------|
| Parent orchestrator | Yes (plan clarification, approval via `approve_plan`, router tune) |
| `harness/planning/*` | No — JSON only |
| `harness/evaluator`, `harness/adversary`, `harness/tie-breaker` | Bridged or `human_required` in output |
| `harness/executor` | No — parent handles governance |

## Spawn pattern (`/harness-plan`)

```
Agent({ subagent_type: "harness/planning/scout-graphify", prompt: "…", run_in_background: true })
Agent({ subagent_type: "harness/planning/scout-structure", prompt: "…", run_in_background: true })
get_subagent_result  # scouts
Agent({ subagent_type: "harness/planning/decompose", prompt: "…" })
Agent({ subagent_type: "harness/planning/hypothesis", prompt: "…" })
# parent: PlanPacket, ask_user on fork
Agent({ subagent_type: "harness/planning/plan-adversary", run_in_background: true })
Agent({ subagent_type: "harness/planning/hypothesis-eval", run_in_background: true })
approve_plan({ plan_packet, research_brief }); create_plan
```

## Tools

- `Agent`, `get_subagent_result`, `steer_subagent`
- `approve_plan`, `create_plan` — parent orchestrator only
- `blackboard` — parent only
- Subagents cannot nest spawns

## References

- ADR 0032, ADR 0033, `.pi/harness/specs/harness-spawn-context.schema.json`
- `node "$UP_PKG/.pi/scripts/harness-agents-manifest.mjs" --check`
