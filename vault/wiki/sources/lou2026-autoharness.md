---
type: source
source_type: paper
title: "AutoHarness: Improving LLM Agents by Automatically Synthesizing a Code Harness"
author: "Lou, Xinghua; Lázaro-Gredilla, Miguel; Dedieu, Antoine; et al."
date_published: 2026-02-10
url: "https://arxiv.org/abs/2603.03329"
confidence: medium
key_claims:
  - "Smaller model (Gemini Flash) can automatically synthesize code harness via iterative refinement"
  - "78% of chess losses were illegal moves — harness eliminates all illegal moves in 145 TextArena games"
  - "Synthesized harness enables smaller model to outperform larger models (Gemini Pro, GPT-5.2)"
  - "Code-policy (entire policy in code, no LLM at decision time) beats larger models on 16 games"
tags:
  - harness
  - auto-synthesis
  - code-generation
  - gemini
created: 2026-04-30
updated: 2026-04-30
status: ingested
---

# AutoHarness: Automatically Synthesizing Code Harnesses

Lou et al., February 2026.

## Core Idea

LLM agents often attempt actions that are prohibited by the environment. Instead of manually writing guardrails, AutoHarness demonstrates that a LLM can automatically synthesize a code harness via iterative refinement with environment feedback.

## Key Numbers

- **78% of Gemini-2.5-Flash losses** in Kaggle GameArena chess attributed to illegal moves
- After AutoHarness: **all illegal moves prevented** across 145 TextArena games
- Synthesized harness + Flash outperforms Gemini-2.5-Pro bare
- Code-policy (fully compiled harness, no LLM at decision time) beats GPT-5.2-High on 16/16 games

## Mechanism

1. LLM generates initial harness code
2. Environment provides feedback (illegal move detection, score)
3. LLM iteratively refines harness code
4. Final harness: prevents all illegal actions, optimizes for reward

## Key Insight

> Using a smaller model to synthesize a custom code harness can outperform a much larger model, while also being more cost effective.

This is the automation of what the survey calls "harness engineering" — turning it from a human practice into an LLM-driven one. Directly relevant to [[lee2026-meta-harness]] which takes this further with outer-loop optimization.

## Relevance to Our Harness

Our harness is manually designed (skill files, schemas, gate logic). AutoHarness suggests that harness components could be automatically synthesized from failure traces. The token budget optimization problem (Phase 10-13) is a natural candidate for auto-synthesis.
