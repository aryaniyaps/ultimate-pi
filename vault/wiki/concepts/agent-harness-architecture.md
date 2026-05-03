---
type: concept
tags:
  - harness
  - architecture
  - context-engineering
  - safety
related:
  - "[[Agentic Orchestration Pipeline]]"
  - "[[Context Engineering]]"
  - "[[Safety Defense-in-Depth]]"
  - "[[sources/martin-fowler-harness-engineering]]"
  - "[[sources/opendev-arxiv-2603.05344v1]]"
---

# Agent Harness Architecture

The harness is everything in an AI coding agent except the model itself: the runtime orchestration layer that wraps the reasoning loop and coordinates tool dispatch, context management, safety enforcement, and session persistence. Defined as: **Agent = Model + Harness**.

## Two-Phase Model

### Scaffolding (Pre-Runtime)
Runs once before the first prompt. Assembles the agent:
- System prompt compilation (conditional, priority-ordered sections)
- Tool schema building (from registry, MCP discovery, subagent schemas)
- Subagent registration and initialization

### Harness (Runtime)
Operates continuously during execution:
- Tool dispatch with safety gating
- Context lifecycle management (compaction, reminders, memory)
- Approval workflows (Manual/Semi-Auto/Auto)
- Session persistence and undo tracking

## Feedforward + Feedback Model

| Direction | Type | Examples |
|-----------|------|----------|
| **Feedforward (Guides)** | Steer before action | System prompts, AGENTS.md, Skills, coding conventions, architecture docs |
| **Feedback (Sensors)** | Observe after action | Linters, tests, review agents, type checkers, structural analysis |

Two execution modes:
- **Computational**: Deterministic, fast — tests, linters, type checkers
- **Inferential**: LLM-based, semantic — AI code reviews, "LLM as judge"

## The Steering Loop

Human developers iterate on the harness: whenever an issue occurs repeatedly, improve feedforward guides or feedback sensors. Agents can help build harness components (write tests, generate linter rules, create documentation).

## Harness Layers (OpenDev Reference)

1. **Prompt Composition**: Conditional sections sorted by priority, provider-specific variants, ${VAR} substitution, two-part caching
2. **Context Engineering**: Staged compaction, event-driven reminders, dual-memory architecture, tool result optimization
3. **Tool System**: Registry with handler categories, lazy MCP discovery, batch execution, 9-pass fuzzy edit matching
4. **Safety System**: 5-layer defense-in-depth (prompt → schema → approval → validation → hooks)
5. **Persistence**: Session storage, operation log/undo, configuration hierarchy, provider cache

## Harness Templates

For common topologies (CRUD APIs, event processors, dashboards), a harness template bundles guides + sensors as a reusable package. Teams select tech stacks partly based on available harnesses.

## Relevance to Our Harness

Our current harness architecture:
- **Scaffolding**: `.pi/skills/` system, agent prompt engineering, wiki as knowledge base
- **Runtime**: `lean-ctx` for tool routing, `Agent` for subagent spawning, `wiki-autoresearch` for research
- **Gaps**: No safety defense-in-depth, no staged compaction, no event-driven reminders, no team dispatch, no sequential chaining
