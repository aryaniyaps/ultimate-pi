---
type: concept
status: developing
created: 2026-05-05
updated: 2026-05-05
tags:
  - compaction
  - context-engineering
  - reinforcement-learning
  - agent-architecture
related:
  - "[[deterministic-session-compaction]]"
  - "[[structured-compaction]]"
  - "[[context-engineering]]"
  - "[[context-continuity]]"
  - "[[context-drift-in-agents]]"
---

# Context Folding

## Definition

Context folding is a structured compaction technique that allows agents to create temporary sub-trajectories (branch), compress them into summaries (fold), and rejoin the main execution thread (return). This reduces active context by ~10x while maintaining agent performance on long-horizon tasks.

## Why It Matters

Three hard problems with expanding context windows for agentic workloads:
1. **Accuracy cliff**: Tool-calling accuracy collapses ~40% past 80K effective-context tokens (Source: [[context-folding-paper]])
2. **Convex cost**: Every additional token is re-read on every subsequent step
3. **Latency growth**: Super-linear with context size

Context folding addresses all three by keeping active context at ~32K even for 200+ step tasks.

## Mechanism

```
main trajectory: [step1] → [step2] → BRANCH → ... → RETURN(summary) → [step N]
                                        |                    |
                                        sub-trajectory       folded away
                                        (detailed steps)     (only summary kept)
```

The agent learns WHEN to branch and WHAT to summarize via FoldGRPO (reinforcement learning with token-level process rewards).

## vs Other Compaction Approaches

| Approach | When | What | How |
|----------|------|------|-----|
| **Context Folding** | Within a single run | Sub-trajectories | Learned RL branching |
| **pi-vcc** | At compaction boundaries | Full conversation | Deterministic extraction |
| **LLM summarization** | At compaction boundaries | Full conversation | LLM generation |
| **Memory systems** | Across runs | Facts/entities | Persistent storage |

## Harness Integration

Context folding maps to our harness differently than pi-vcc:
- **L2.5 Drift Monitor**: Could branch/fold drift detection sub-trajectories
- **L3 Execution**: Natural fit for multi-tool exploration sequences
- **L4 Adversarial**: Critic evaluation as branch/fold sub-trajectory

Now available as first-class API primitive in Anthropic's context-management beta.

## Open Questions

- How does FoldGRPO training transfer across domains?
- Can deterministic folding rules (without RL) approximate learned behavior?
- Integration path with Pi's event system (`session_before_compact`)?
