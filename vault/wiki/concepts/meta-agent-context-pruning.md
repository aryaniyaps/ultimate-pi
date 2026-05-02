---
aliases: ["meta-agent pruning", "context drift meta-agent", "stuck-agent recovery"]
type: concept
title: "Meta-Agent Context Pruning"
created: 2026-04-30
status: developing
tags:
  - concept
  - meta-agent
  - context-pruning
  - agent-reliability
  - harness-design
related:
  - "[[Research: Meta-Agent Context Drift Detection]]"
  - "[[context-drift-in-agents]]"
  - "[[agent-loop-detection-patterns]]"
  - "[[guardian-agent-pattern]]"
  - "[[ironclaw-drift-monitor]]"
  - "[[harness-configuration-layers]]"
  - "[[grounding-checkpoints]]"
updated: 2026-05-02

---# Meta-Agent Context Pruning

A proposed system: a separate observer (meta-agent) monitors the primary coding agent for stuck behavior, detects context drift, prunes irrelevant history from the context window, and restarts the agent with clean context. This is a **novel synthesis** — each component exists independently in literature and practice, but the full pipeline (detect → identify dead-ends → prune → restart) has not been published as a single system.

## Architecture

```
┌─────────────────────────────────────────────────┐
│               META-AGENT (Observer)               │
│                                                   │
│  ┌──────────┐   ┌──────────┐   ┌──────────────┐  │
│  │ DETECT   │ → │IDENTIFY  │ → │  PRUNE +     │  │
│  │ stuck    │   │ dead-end │   │  RESTART     │  │
│  │ pattern  │   │ entries  │   │              │  │
│  └──────────┘   └──────────┘   └──────────────┘  │
│       ↑                               │           │
│       │ monitors                      │ injects   │
│       │                               ↓           │
│  ┌──────────────────────────────────────────┐    │
│  │        PRIMARY AGENT (Coding Agent)       │    │
│  │  tool calls → errors → retries → context  │    │
│  │  fills with noise → gets more lost       │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

## Pipeline

### Phase 1: Detection

Rule-based pattern matching on tool call history. Zero LLM overhead.

| Pattern | Method | Threshold |
|---------|--------|-----------|
| Repetition | Hash(tool + args), count in window | 3+ in 10 calls |
| Failure spiral | Consecutive error count | 4+ |
| Tool cycling | Sequence pattern A-B-A-B-A-B | 6 calls |
| Silence drift | Iterations since last text response | 15+ |
| Rework churn | Same file path written repeatedly | 3+ |
| Excessive searching | ls/find/grep calls without code edits | 5+ |

Optionally: LLM-based semantic drift check every N steps for higher precision on nuanced stuckness.

### Phase 2: Identify Dead-End Entries

Classify each context entry as keep or prune:

**Keep**: Error led to different approach on next attempt. Output contained new information. User explicitly requested. Established a constraint.

**Prune**: Identical call returned same result. Pure noise (boilerplate errors). Agent forgot about it entirely.

Conservative default: when uncertain, keep. False-positive pruning is worse than false-negative (keeping noise).

### Phase 3: Prune + Restart

Two implementation strategies:

**Strategy A — In-place editing** (if API supports message deletion from middle of history): Keep original task, key decisions, constraints discovered, last successful state. Remove dead-end entries between them. Inject correction message.

**Strategy B — Session restart** (portable, always works): Terminate current session. Start new session with: original system prompt + task + pruned history summary + correction message.

### Phase 4: Correction Injection

Escalation model:
1. **Soft**: "You've called [tool] with same args 3 times. Summarize what you know and try a different approach."
2. **Strong**: "You're stuck. Here's a summary of what you've accomplished. Start fresh from here." (includes pruned context summary)
3. **Forced restart**: Terminate, prune, restart with clean context.

## Feasibility

**High**. Each component is individually validated:

- Detection: Production-proven (ironclaw DriftMonitor, LangSight loop detection)
- Pruning: Conceptually similar to context compaction (Anthropic Claude Code) and code-level pruning (SWE-Pruner)
- Restart: Standard pattern in multi-agent systems (sub-agent isolation)

**Novelty**: The composition. No existing system combines all three phases.

## Overhead

| Component | Tokens | Notes |
|-----------|--------|-------|
| Rule-based detection | 0 | Hash comparison + counters |
| LLM-based detection (optional) | ~500/check | Every 10-15 steps |
| Pruning | 0 | Metadata operation |
| Correction injection | ~150/injection | Max 3 injections |
| Session restart | 1 API call | Cache miss cost |
| **Total** | **~1,500-3,000** | Per 50-step session |

**Net savings**: 5-10x token reduction when stuck sessions are common. Breakeven after 1-2 interventions.

## Edge Cases

- **Polling agents**: Whitelist polling tools. Use time-based windows, not count-based.
- **Retry-heavy workflows**: Increase thresholds (5-7). Some tools legitimately fail transiently.
- **Exploratory searching**: Distinguish by whether code edits follow the searches.
- **Mid-reasoning interruption**: Pruning while the model is mid-chain-of-thought may lose coherence. Needs testing.

## Harness Integration

Proposed as **Layer 2.5 — Runtime Drift Monitor** in the ultimate-pi harness:

```
L1 (Spec Hardening) → L2 (Structured Planning) → L2.5 (Drift Monitor) → L3 (Execution + Grounding)
```

Components:
- `lib/harness-drift-monitor.ts` — Detection engine, pruning logic, correction injection
- `extensions/harness-drift-monitor.ts` — Hooks into before_llm_call / after_tool_call
- `.pi/harness/drift-monitor.json` — Config: thresholds, escalation, whitelists, model profile

Model-adaptive: Rule-based every step for GPT, rule-based every 10 steps for Gemini, LLM-based every 15 steps for Opus.

## Open Questions

- Can context be pruned in-place or must it always restart? API support varies.
- What is the minimum context that must survive pruning?
- Does pruning break chain-of-thought coherence?
- How does pruning interact with prompt caching (cache invalidation)?
- Can a small model (Haiku/Flash) serve as the meta-agent detector?
- Does the meta-agent itself need drift monitoring? (Infinite regress risk)

## See Also

- [[context-drift-in-agents]] — The problem this solves
- [[agent-loop-detection-patterns]] — Detection code and patterns
- [[guardian-agent-pattern]] — Complementary proactive approach
- [[Research: Meta-Agent Context Drift Detection]] — Full research synthesis
- [[harness-configuration-layers]] — Where this fits in the four-layer harness model
