---
type: source
source_type: paper
title: "Meta-Harness: End-to-End Optimization of Model Harnesses"
author: "Lee, Yoonho; Nair, Roshen; Zhang, Qizheng; et al."
date_published: 2026-03-30
url: "https://arxiv.org/abs/2603.28052"
confidence: medium
key_claims:
  - "Outer-loop system searches over harness code for LLM applications"
  - "Agentic proposer accesses source code, scores, and execution traces via filesystem"
  - "7.7pt improvement on text classification with 4x fewer context tokens"
  - "4.7pt improvement on IMO-level math problems across 5 held-out models"
  - "Surpasses best hand-engineered baselines on TerminalBench-2"
tags:
  - harness
  - meta-learning
  - optimization
  - terminal-bench
created: 2026-04-30
updated: 2026-04-30
status: ingested

---# Meta-Harness: End-to-End Optimization of Model Harnesses

Lee et al., March 2026. Stanford / Together AI.

## Core Idea

Harnesses are still designed largely by hand. Meta-Harness is an outer-loop system that automatically searches over harness code, using an agentic proposer with access to source code, scores, and execution traces from all prior candidates.

## Architecture

- **Agentic Proposer**: LLM that reads existing harness code + execution traces + scores
- **Filesystem-based memory**: All prior candidates, their code, traces, and scores available
- **Outer-loop**: Proposer generates new harness variant → evaluate → add to candidate pool → repeat

Key difference from AutoHarness: Meta-Harness sees ALL prior experiments, not just the last one.

## Results

| Domain | Improvement | Context Savings |
|--------|-------------|-----------------|
| Text classification | +7.7 pts | 4x fewer tokens |
| IMO math reasoning | +4.7 pts | Across 5 held-out models |
| Agentic coding (TerminalBench-2) | Surpasses hand-engineered | — |

## Key Insight

> Richer access to prior experience can enable automated harness engineering.

This directly challenges the assumption that harness design must be a human engineering practice. It suggests a future where harnesses self-optimize from execution traces.

## Relevance to Our Harness

Our current pipeline is manually configured. Meta-Harness suggests:
- Adding a "harness optimizer" that runs off failure traces
- Auto-tuning token budgets per layer based on observed vs actual usage
- Generating model-specific harness variants (our model-adaptive profiles could be learned, not hand-coded)
