---
type: concept
title: "Harness H-Formalism (H = ETCSLV)"
created: 2026-04-30
updated: 2026-04-30
status: seed
tags:
  - harness
  - architecture
  - formal-model
related:
  - "[[agentic-harness]]"
  - "[[harness-implementation-plan]]"
  - "[[model-adaptive-harness]]"
sources:
  - "[[meng2026-agent-harness-survey]]"
---

# Harness H-Formalism

The six-component formal model of an agent execution harness, from Meng et al. (2026): **H = (E, T, C, S, L, V)**.

## Components

| Symbol | Name | Function |
|--------|------|----------|
| **E** | Execution Loop | Observe-think-act cycle, termination conditions, error recovery |
| **T** | Tool Registry | Typed tool catalog, routing, monitoring, schema validation |
| **C** | Context Manager | What enters the context window, compaction, retrieval |
| **S** | State Store | Persistence across turns/sessions, crash recovery |
| **L** | Lifecycle Hooks | Auth, logging, policy enforcement, instrumentation |
| **V** | Evaluation Interface | Action trajectories, intermediate states, success signals |

## Key Finding

> No agent framework can achieve production reliability without implementing ALL six governance components.

## Mapping to Our Harness

| H Component | Our Implementation |
|-------------|-------------------|
| E | L1-L4 pipeline (Spec → Plan → Execute → Verify) |
| T | Tool schemas, MCP tools, skills |
| C | Wiki knowledge base, context compaction, AST truncation |
| S | Wiki vault persistence, session memory (ctx_session) |
| L | Archon L7 orchestration, post-edit validation hooks |
| V | L4 adversarial verification, L5 observability |

## Gaps

- No formal specification language for component contracts
- L-component (lifecycle hooks) is implicit, not explicit
- V-component does not track intermediate action trajectories systematically
- No cross-harness portability testing
