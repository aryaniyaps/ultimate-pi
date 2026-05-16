---
name: harness-orchestration
description: >-
  Orchestrate ultimate-pi harness phases with Agent spawns, blackboard handoffs,
  and observation-bus artifacts. Use for plan/execute/evaluate pipelines, L4
  verification, parallel scouts, and debate prep.
---

# Harness orchestration

## Agent IDs (namespaced)

Spawn with the `Agent` tool using **path ids** from the installed package:

| Phase | `subagent_type` | Policy |
|-------|-----------------|--------|
| Plan | `harness/planner` | May use `ask_user` |
| Execute | `harness/executor` | `ask_user` for in-scope forks only |
| Verify | `harness/evaluator`, `harness/adversary`, `harness/tie-breaker` | `disallowed_tools: ask_user` on L4 agents |
| Meta | `harness/meta-optimizer`, `harness/trace-librarian` | Parent calls `ask_user` for approvals |

Pi-pi experts: `pi-pi/agent-expert`, `pi-pi/cli-expert`, etc.

Project override: `.pi/agents/harness/planner.md` replaces package `harness/planner` only.

## Tools

- `Agent` — spawn (prefer `run_in_background: true` for parallel work)
- `get_subagent_result` / `steer_subagent` — background agents
- `blackboard` — orchestrator handoffs (`list`, `read`, `query`, `wait`, `delete`)
- `ask_user` — **parent orchestrator only** on L4 paths

Subagents cannot spawn sub-subagents (`Agent`, `blackboard`, `ask_user` blocked).

## Blackboard + bus

1. Scouts/workers post findings to `blackboard` (namespaced keys).
2. Spawn with `context: { keys: ["scout:*"] }` or `{ agent_name: "…" }` (~8k cap).
3. On completion, `harness-subagents` appends `harness-observation` entries for `observation-bus`.
4. Durable artifacts (PlanPacket, EvalVerdict, debate envelopes) still go to trace/run files per harness specs.

## Pipeline rules (V2-aligned)

- **Plan gate first** — no implementation without an approved `PlanPacket`.
- **L4 external verification** — evaluator ≠ executor; use `harness/adversary` when policy requires.
- **Turn budgets** — set `max_turns` on spawn or rely on agent frontmatter defaults.
- **Parallelism** — parallelize by file/module with explicit ownership in the plan.
- **Debate** — use `debate-orchestrator` commands; parent handles `human_required` via `ask_user`.

## References

- Package agents: `$UP_PKG/.pi/agents/`
- Manifest drift: `node "$UP_PKG/.pi/scripts/harness-agents-manifest.mjs" --check`
- Reference playbook: `raw/references/subagents/AGENTS.md` (design only)
