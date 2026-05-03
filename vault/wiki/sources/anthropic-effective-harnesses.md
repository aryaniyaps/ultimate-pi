---
type: source
source_type: engineering-blog
author: "Justin Young (Anthropic)"
date_published: 2025
url: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
confidence: high
tags:
  - anthropic
  - agent-harness
  - long-running-agents
  - context-windows
key_claims:
  - "A harness is the runtime framework that coordinates tool dispatch, context lifecycle, progress tracking, and clean handoffs between context windows"
  - "Long-running agents need structured handoffs between context windows"
  - "The harness must manage context as a finite resource across extended timeframes"
---

# Effective Harnesses for Long-Running Agents

Anthropic Engineering Blog — 2025. By Justin Young.

## Core Definition

A harness is the runtime orchestration layer that wraps the core reasoning loop and coordinates:
- Tool dispatch
- Context lifecycle management
- Safety enforcement
- Session persistence
- Progress tracking
- Clean handoffs between context windows

## Key Principles

1. **Context windows are finite resources** — the harness must manage them explicitly across long timeframes
2. **Structured handoffs** — when context fills, the harness must summarize and transfer state to a fresh window
3. **Progress tracking** — agents must maintain awareness of what's been done across context boundaries
4. **Safety invariants** — the harness enforces constraints that persist across context resets

## Relevance

This is the authoritative definition of "harness" as used in the agent engineering community. It maps directly to disler's Pi extensions (subagent-widget, agent-team, agent-chain) and OpenDev's four-layer architecture. Our harness implementation should treat context as a managed resource with explicit handoff protocols.
