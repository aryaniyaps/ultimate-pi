---
type: concept
tags:
  - context-engineering
  - token-management
  - compaction
  - memory
related:
  - "[[Agent Harness Architecture]]"
  - "[[sources/opendev-arxiv-2603.05344v1]]"
  - "[[sources/martin-fowler-harness-engineering]]"
---

# Context Engineering

The practice of managing an LLM's context window as a first-class engineering concern. Context is a finite, expensive resource consumed by system prompts, tool schemas, conversation history, and tool outputs. Effective context engineering determines how long an agent can operate before context overflow degrades performance.

## Core Principles

1. **Entropy reduction**: Each context element should reduce uncertainty about the desired output
2. **Minimal sufficiency**: Include only what is necessary to avoid attention dilution
3. **Semantic continuity**: Context should evolve coherently across turns, not be reconstructed from scratch

## Key Techniques

### Adaptive Context Compaction (ACC)
Five graduated stages instead of a single emergency threshold:
- **70%**: Warning — log pressure, track trends
- **80%**: Observation Masking — replace old tool results with reference pointers (~15 tokens each)
- **85%**: Fast Pruning — walk backward, replace oldest results with `[pruned]` markers
- **90%**: Aggressive Masking — shrink preservation window to most recent outputs only
- **99%**: Full Compaction — LLM-based summarization of middle portion, keep recent verbatim

ACC reduces peak context consumption by ~54%, often eliminating the need for emergency compaction.

### Dual-Memory Architecture
- **Episodic memory**: LLM summary of full history (strategic context). Regenerated from full history every 5 messages to prevent summary drift.
- **Working memory**: Last 6 exchanges verbatim (operational detail).

### Event-Driven System Reminders
Short, targeted messages injected at decision points (not upfront in system prompt). Use `role: user` for maximum recency. Governed by counter budgets to prevent noise.

### Lazy Tool Discovery
Only discovered/explicitly invoked MCP tool schemas consume context. Baseline overhead: <5% instead of 40%.

### Tool Result Optimization
Per-tool-type summarization (file reads → metadata, search → match counts, directory listings → item counts). Large outputs (>8,000 chars) offloaded to scratch files with previews.

### Prompt Caching
Split system prompt into stable (cacheable) and dynamic parts. Stable portion (~80-90%) receives `cache_control` header, yielding ~88% input cost reduction on cached tokens.

## Calibration

Always use the API's reported `prompt_tokens` as calibration anchor, not local estimates. Providers inject invisible content (safety preambles, tool serialization) that local counting misses.

## Relevance to Our Harness

- No staged compaction — we rely on session restarts when context fills
- No event-driven reminders — our system prompt decays over long sessions
- No dual-memory — thinking contexts share full history
- Partial tool result optimization — `lean-ctx` compresses bash output
- Lazy discovery pattern exists — `ctx_discover_tools` for lean-ctx
