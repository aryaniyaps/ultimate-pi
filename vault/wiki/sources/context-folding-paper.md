---
type: source
source_type: paper
title: "Scaling Long-Horizon LLM Agent via Context-Folding"
author: "Sun et al. (ByteDance Seed, CMU, Stanford)"
date_published: 2025-10-15
date_accessed: 2026-05-05
url: "https://arxiv.org/abs/2510.11967"
confidence: high
tags:
  - context-folding
  - compaction
  - reinforcement-learning
  - agent-architecture
  - academic-paper
key_claims:
  - "200-step agents in 10x less context (32K tokens vs 327K baseline)"
  - "62.0% on BrowseComp-Plus, 58.0% on SWE-Bench Verified with 32K budget"
  - "FoldGRPO: RL framework with token-level process rewards for learned folding"
  - "Branch/return sub-trajectories replace settled segments with summaries"
  - "Outperforms summarization-based context management"
  - "Tool-calling accuracy collapses ~40% past 80K effective-context tokens"
  - "Now available as first-class API primitive in Anthropic's context-management beta"
---

# Context Folding

## Summary

Context Folding (arXiv 2510.11967) is a structured compaction technique from ByteDance Seed, CMU, and Stanford that enables 200+ step agents to maintain only ~32K active tokens — 10x less than naive approaches. Published October 2025.

## Core Mechanism

Agents create temporary sub-trajectories for subtasks via a "branch" action. Upon completion, intermediate steps are summarized and "folded" away via a "return" action, leaving only the compressed artifact in active context.

**Key distinction**: Folding compresses WITHIN a single run. Memory persists ACROSS runs. Different problems, different solutions.

## FoldGRPO

End-to-end reinforcement learning framework that makes folding behavior learnable. Uses token-level process rewards to encourage effective task decomposition and context management. Agents learn WHEN and HOW to branch and fold.

## Results

| Benchmark | Folding (32K) | Baseline (327K) |
|-----------|---------------|-----------------|
| BrowseComp-Plus | 62.0% | < 62.0% |
| SWE-Bench Verified | 58.0% | comparable |

Significantly outperforms summarization-based context management.

## Critical Finding

Past ~80K effective-context tokens, agent tool-calling accuracy collapses by approximately 40%. This is a hard cliff, not a gradual decline. Context windows beyond 80K are misleading for agentic workloads.

## Relevance to pi-vcc

Context folding is a fundamentally different approach from pi-vcc:
- **Folding**: Learned, within-run, branch/return structure, RL-trained
- **pi-vcc**: Deterministic, at compaction boundaries, extraction-based, no ML

They could theoretically combine: pi-vcc for deterministic boundary compaction + context folding for within-run trajectory management.
