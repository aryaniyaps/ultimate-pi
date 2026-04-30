---
aliases: ["guardian agent", "pre-execution safety", "agent guardrails"]
type: concept
title: "Guardian Agent Pattern"
created: 2026-04-30
tags:
  - concept
  - guardian-agent
  - safety
  - agent-reliability
related:
  - "[[Research: Meta-Agent Context Drift Detection]]"
  - "[[meta-agent-context-pruning]]"
  - "[[context-drift-in-agents]]"
  - "[[vectara-guardian-agents]]"
  - "[[ironclaw-drift-monitor]]"
---

# Guardian Agent Pattern

A design pattern where a separate agent (or rule-based system) monitors and validates another agent's actions — either before execution (proactive) or after detecting failure patterns (reactive). Emerging as a standard approach for production agent reliability.

## Two Variants

### Proactive Guardian (Pre-Execution)

Validates proposed actions BEFORE they execute. Blocks unsafe, incorrect, or incomplete tool calls.

**Example**: Vectara's Guardian Agents check three things before any tool executes:
1. Unnecessary tools (should this tool be part of the plan?)
2. Missing required tools (does the plan include all needed tools?)
3. Argument validation (are parameters correct, present, properly structured?)

Feedback aggregated and returned to agent for plan revision. (Source: [[vectara-guardian-agents]])

### Reactive Guardian (Post-Execution)

Monitors tool call history, detects failure patterns after they emerge, and injects corrective actions.

**Example**: ironclaw's DriftMonitor detects 5 stuck patterns (repetition, failure spiral, tool cycling, silence drift, rework churn) and injects system messages. (Source: [[ironclaw-drift-monitor]])

**Example**: The proposed meta-agent context pruning extends this by also removing dead-end context entries.

## Academic Treatment

**GuardAgent** (OpenReview): First LLM agent serving as guardrail for other LLM agents. Checks inputs/outputs against guard requests (safety rules, privacy policies). Training-free, in-context-learning-based.

**GUARDIAN** (NeurIPS 2025): Models multi-agent collaboration as temporal attributed graph. Detects propagation dynamics of hallucinations and errors. State-of-the-art accuracy with efficient resource utilization.

## Complementary Approaches

Proactive (Guardian Agents) and reactive (Meta-Agent / DriftMonitor) are complementary:

```
User Request → [Guardian Agent: validate plan] → [Agent executes] → [Meta-Agent: monitor for drift]
                     ↑ blocks bad plans                                  ↑ prunes context if stuck
```

Guardian Agents prevent execution-level errors. Meta-Agent recovers when the agent gets past the guardian but still gets stuck (context pollution, reasoning drift, unexpected tool behavior).

## See Also

- [[meta-agent-context-pruning]] — Reactive guardian with context pruning
- [[vectara-guardian-agents]] — Source: benchmark and proactive guardian design
- [[ironclaw-drift-monitor]] — Source: reactive DriftMonitor proposal
- [[context-drift-in-agents]] — The problem both approaches address
