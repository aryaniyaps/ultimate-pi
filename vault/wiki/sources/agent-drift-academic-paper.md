---
type: source
source_type: academic-paper
title: "Agent Drift: Quantifying Behavioral Degradation in Multi-Agent LLM Systems Over Extended Interactions"
author: Abhishek Rath
date_published: 2026-01-07
url: https://arxiv.org/abs/2601.04170
confidence: high
key_claims:
  - "Agent drift: progressive degradation in behavior, decision quality, and inter-agent coherence"
  - "42% task success rate reduction, 3.2x human intervention increase in drifted systems"
  - "ASI (Agent Stability Index): composite metric across 12 behavioral dimensions"
  - "Three drift types: semantic, coordination, behavioral"
  - "Combined mitigation strategies achieve 81.5% drift reduction"
tags:
  - source
  - academic
  - agent-drift
  - multi-agent
  - reliability
related:
  - "[[Research: Meta-Agent Context Drift Detection]]"
  - "[[context-drift-in-agents]]"
  - "[[agent-loop-detection-patterns]]"
---

# Agent Drift: Academic Paper

## Summary

Foundational academic paper establishing agent drift as a measurable, quantifiable phenomenon in multi-agent LLM systems. Introduces the Agent Stability Index (ASI) — a composite metric across 12 dimensions in 4 categories. Demonstrates through simulation that unchecked drift causes 42% task success reduction and 3.2x human intervention increase.

## What It Contributes

Provides the academic foundation for agent drift as a real problem (not just anecdotal). The ASI framework gives a rigorous measurement methodology. The mitigation strategies (EMC, DAR, ABA) validate that drift can be controlled. Establishes that context window pollution is a primary mechanism — directly supporting the case for context pruning.

## Three Drift Types

1. **Semantic drift**: Agent outputs progressively deviate from original task intent while remaining syntactically valid
2. **Coordination drift**: Multi-agent consensus mechanisms degrade, leading to conflicts, redundant work
3. **Behavioral drift**: Agents develop novel strategies not present in initial interactions

## Agent Stability Index (ASI)

Composite metric across 12 dimensions in 4 categories:

1. **Response Consistency** (weight: 0.30): Output semantic similarity, decision pathway stability, confidence calibration
2. **Tool Usage Patterns** (weight: 0.25): Tool selection stability, tool sequencing consistency, parameterization drift
3. **Inter-Agent Coordination** (weight: 0.25): Consensus agreement rate, handoff efficiency, role adherence
4. **Behavioral Boundaries** (weight: 0.20): Output length stability, error pattern emergence, human intervention rate

ASI computed over rolling 50-interaction windows. Drift detected when ASI <0.75 for 3 consecutive windows.

## Key Findings

- Drift emerges after median 73 interactions (far earlier than expected)
- Drift accelerates: 0.08 ASI decline per 50 interactions (early) → 0.19 per 50 (late)
- Financial analysis agents drift fastest (53.2% by 500 interactions) due to task ambiguity
- Two-level hierarchies (router + specialists) are most drift-resistant
- External memory systems (vector DBs, structured logs) provide "behavioral anchors"

## Three Mitigation Strategies

1. **Episodic Memory Consolidation (EMC)**: Periodic compression of agent interaction histories → 51.9% drift reduction
2. **Drift-Aware Routing (DAR)**: Router uses agent stability scores in delegation, resets drifting agents → 63.0% reduction
3. **Adaptive Behavioral Anchoring (ABA)**: Few-shot prompt augmentation with baseline exemplars → 70.4% reduction
4. **Combined (all three)**: 81.5% drift reduction, 23% computational overhead

## Three Causal Mechanisms

1. **Context window pollution**: Interaction histories fill with irrelevant information, diluting signal-to-noise
2. **Distributional shift**: Agents encounter input distributions increasingly divergent from training data
3. **Reinforcement through autoregression**: Small errors compound through feedback loops in shared memory

## Relevance to Meta-Agent Concept

This paper validates that context window pollution is a primary causal mechanism of agent drift. Context pruning directly addresses this mechanism. The ASI framework provides metrics for evaluating whether pruning is effective. The finding that drift emerges after ~73 interactions sets a natural checkpoint frequency for meta-agent monitoring.
