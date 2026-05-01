---
type: concept
title: "Antigravity Agent-First Architecture"
status: developing
created: 2026-05-01
updated: 2026-05-01
tags:
  - antigravity
  - agent-architecture
  - harness-design
aliases: ["agent-first IDE", "Antigravity architecture"]
related:
  - "[[agentic-harness]]"
  - "[[model-adaptive-harness]]"
  - "[[harness-implementation-plan]]"
sources:
  - "[[google-antigravity-official-blog]]"
  - "[[google-antigravity-wikipedia]]"
  - "[[cursor-vs-antigravity-2026]]"
---

# Antigravity Agent-First Architecture

Google Antigravity's foundational architectural shift: the IDE is not an AI-enhanced editor. It is a **control plane for autonomous coding agents**.

## The Two-View Architecture

### Editor View
Traditional IDE interface (VS Code fork). Agent sidebar. Tab completions, inline commands. For hands-on synchronous workflows.

### Manager View ("Mission Control")
Dedicated orchestration interface. Spawn, supervise, and redirect multiple agents working asynchronously across different workspaces. The human shifts from coder to architect.

## Core Innovation: The Inversion

```
Traditional: Human → IDE → Agent (agent as assistant in sidebar)
Antigravity: Human → Manager View → Multiple Agents → Editor/Browser/Terminal
```

The Manager View inverts the relationship. The interface is embedded in the agent, not the other way around. Agents have direct access to editor, terminal, and browser as equal tool surfaces.

## What This Means for Harness Design

Our 8-layer harness is a **pipeline** (sequential, mandatory layers). Antigravity's is a **control plane** (parallel agents, asynchronous execution).

These are complementary architectures:
- **Pipeline**: Best for quality enforcement, correctness guarantees, drift detection
- **Control Plane**: Best for parallelism, task delegation, human oversight

The harness should adopt the control-plane model for its L7 orchestration layer while keeping the pipeline model for L1-L4 quality enforcement.

## Four Design Tenets

1. **Trust**: Artifacts replace raw tool logs. Agents prove work via verifiable deliverables.
2. **Autonomy**: Agents have full control of multiple surfaces. No constant human prompts.
3. **Feedback**: Google Docs-style commenting on artifacts. Asynchronous. No restart needed.
4. **Self-Improvement**: Agents learn from past work. Knowledge base persists across projects.

## Our Gap

The harness has no Manager View equivalent. L7 (Schema Orchestration) is DAG-based sequential orchestration, not parallel agent dispatch. This is a design gap — but may be intentional: our harness targets CLI-level enforcement, not IDE-level.
