---
aliases: ["agent drift", "behavioral drift", "context drift in agents"]
type: concept
title: "Context Drift in AI Agents"
created: 2026-04-30
status: developing
tags:
  - concept
  - drift
  - agent-reliability
  - context-engineering
related:
  - "[[Research: Meta-Agent Context Drift Detection]]"
  - "[[meta-agent-context-pruning]]"
  - "[[agent-loop-detection-patterns]]"
  - "[[guardian-agent-pattern]]"
  - "[[agent-drift-academic-paper]]"
  - "[[ironclaw-drift-monitor]]"
  - "[[model-adaptive-harness]]"
updated: 2026-05-02

---# Context Drift in AI Agents

The progressive degradation of agent behavior, decision quality, and task coherence over extended interactions. Not a model failure — a context management failure.

## Two Definitions

The term "context drift" is used in two distinct ways in the literature:

### 1. Stale Environment Context (Infrastructure Drift)

The agent's view of the world diverges from reality because data sources haven't caught up. The agent reads stale state, makes decisions based on it, detects mismatch, re-plans, and loops. (Source: [[vectara-guardian-agents|Tacnode]])

**Cause**: Slow data pipelines, batch ETL, separate OLTP/OLAP stores. The stack was built for human consumers (dashboards, periodic queries), not sub-second agent freshness.

**Fix**: Unified context lake with instant freshness guarantees. Reduce hops between event and agent visibility.

### 2. Context Window Pollution (Interaction Drift)

The agent's context window fills with irrelevant information from failed attempts, verbose outputs, and dead-end explorations. Signal-to-noise collapses. The agent's decisions degrade because it's reasoning over noise. (Source: [[agent-drift-academic-paper]])

**Cause**: Multi-turn agent loops where every tool call and response accumulates in context. Failed attempts add noise. Successful attempts may be too verbose. No mechanism prunes irrelevant history.

**Fix**: Context compaction (summarize + restart), context pruning (remove dead-ends), external memory (structured notes outside context window).

## The Meta-Agent Problem Space

This concept page addresses the **second** definition — interaction drift from context window pollution. The meta-agent concept targets exactly this: detecting when context pollution has reached a critical point and pruning the context to restore signal quality.

## Drift Taxonomy

From the academic literature (Source: [[agent-drift-academic-paper]]):

| Type | Definition | Example |
|------|-----------|---------|
| **Semantic drift** | Outputs deviate from original intent while staying syntactically valid | Financial analysis agent shifts from risk-focused to opportunity-emphasizing language |
| **Coordination drift** | Multi-agent consensus breaks down | Router develops bias toward certain sub-agents, creating bottlenecks |
| **Behavioral drift** | Novel strategies emerge not present in initial interactions | Agent caches data in chat history instead of using designated memory tools |

## Stuck-Pattern Signatures

Operational patterns that indicate context drift (Source: [[ironclaw-drift-monitor]]):

| Pattern | Signature | Threshold |
|---------|-----------|-----------|
| Repetition loops | Same tool + same args called repeatedly | 3+ in 10 calls |
| Failure spirals | Consecutive tool failures | 4+ |
| Tool cycling | A-B-A-B-A-B alternation | 6 calls |
| Silence drift | No text response | 15+ iterations |
| Rework churn | Same file written repeatedly | 3+ writes |
| Excessive searching | ls/find/grep without code edits | 5+ searches |

## Quantified Impact

From 847 simulated workflows (Source: [[agent-drift-academic-paper]]):

- Task success rate: -42% (87.3% → 50.6%)
- Human interventions: +216% (0.31/task → 0.98/task)
- Token usage: +52.4% (12,400 → 18,900)
- Inter-agent conflicts: +487.5%
- Drift emerges after median 73 interactions — far earlier than expected

## Three Causal Mechanisms

1. **Context window pollution**: Irrelevant history dilutes signal. Episodic Memory Consolidation directly addresses this.
2. **Distributional shift**: Narrow domain language diverges from broad training distribution over time.
3. **Autoregressive reinforcement**: Small errors compound through feedback loops — an unnecessarily verbose response sets precedent for future verbosity.

## Mitigation Approaches

| Approach | Mechanism | Drift Reduction | Overhead |
|----------|-----------|----------------|----------|
| Episodic Memory Consolidation | Summarize + compress history | 51.9% | Moderate (summarization cost) |
| Drift-Aware Routing | Stability scores in delegation | 63.0% | Low (metric computation) |
| Adaptive Behavioral Anchoring | Few-shot exemplars from baseline | 70.4% | Low (prompt augmentation) |
| Context Pruning (proposed) | Remove dead-end entries | Unknown | Low (metadata operation) |
| Combined (all three above) | Multi-layer defense | 81.5% | +23% compute |

The proposed meta-agent context pruning would add a fourth approach to this arsenal — one that operates at the conversation-history level rather than the prompt or routing level.

## See Also

- [[meta-agent-context-pruning]] — The proposed system combining detection + pruning + restart
- [[agent-loop-detection-patterns]] — Production-grade loop detection code
- [[guardian-agent-pattern]] — Pre-execution safety validation
- [[agentic-harness-context-enforcement]] — Enforcing context-efficient behavior
