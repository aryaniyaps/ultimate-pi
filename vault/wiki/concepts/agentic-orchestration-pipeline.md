---
type: concept
tags:
  - orchestration
  - multi-agent
  - pipeline
  - agent-architecture
related:
  - "[[Agent Harness Architecture]]"
  - "[[Multi-Agent Specialization]]"
  - "[[sources/disler-pi-vs-claude-code]]"
  - "[[sources/opendev-arxiv-2603.05344v1]]"
---

# Agentic Orchestration Pipeline

A structured workflow where multiple specialized AI agents coordinate to complete complex software engineering tasks. The orchestrator decomposes work, routes to specialists, and assembles results.

## Three Orchestration Patterns

### 1. Subagent Delegation (Fan-out)
A primary agent spawns isolated subagents for independent subtasks. Each subagent runs in its own context window with filtered tool access. Results are collected and synthesized by the primary agent.

**Implementation**: Pi's `subagent-widget` extension (`/sub <task>`), OpenDev's `spawn_subagent` tool.

**Best for**: Parallel exploration, isolated analysis, background tasks.

### 2. Team Dispatch (Specialist Routing)
A dispatcher agent reviews user requests and selects the most appropriate specialist from a predefined roster. Each specialist has a domain-specific system prompt and tool set.

**Implementation**: Pi's `agent-team` extension, configured via `.pi/agents/teams.yaml`. The dispatcher uses a `dispatch_agent` tool.

**Best for**: Work that benefits from domain expertise (frontend vs backend, planning vs execution).

### 3. Sequential Chaining (Pipeline)
Multiple agents execute in sequence where each step's output feeds into the next step's prompt. The `$INPUT` variable carries the previous step's output; `$ORIGINAL` always contains the initial user prompt.

**Implementation**: Pi's `agent-chain` extension, defined in `.pi/agents/agent-chain.yaml` as a list of `steps` with `agent` and `prompt` fields.

**Best for**: Multi-phase workflows (plan → build → review → fix → verify).

## Design Principles

1. **Schema-level isolation**: Subagents receive filtered tool schemas — they can't attempt actions they shouldn't perform. More robust than runtime permission checks.
2. **Context isolation**: Each subagent runs with an independent conversation history. Only summaries return to the parent, preventing context pollution.
3. **Explicit termination**: Subagents have clear stop conditions to prevent over-exploration.
4. **Parallel execution**: Independent subagent calls auto-parallelize via thread pools.
5. **Model specialization**: Different pipeline stages can use different models (e.g., Opus for planning, Sonnet for building, Haiku for reviewing).

## Harness Implementation Path

Our harness can adopt all three patterns as Pi extensions:
1. Extend existing `Agent` tool with team dispatch via YAML config
2. Add chain orchestration with `$INPUT` variable injection
3. Implement context isolation per subagent (fresh conversation per spawn)
4. Add progress dashboards (grid for teams, step tracker for chains)
