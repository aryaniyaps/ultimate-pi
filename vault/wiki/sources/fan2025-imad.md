---
type: source
source_type: paper
title: "iMAD: Intelligent Multi-Agent Debate for Efficient and Accurate LLM Inference"
author: "Fan, Wei; Yoon, JinYi; Ji, Bo"
date_published: 2025-11-14
url: "https://arxiv.org/abs/2511.11306"
confidence: medium
key_claims:
  - "Selective debate: only trigger multi-agent debate when likely beneficial"
  - "41 linguistic features extracted from self-critique to predict debate benefit"
  - "92% token reduction compared to always-debate"
  - "13.5% accuracy improvement over single-agent"
  - "Debate can overturn correct answers — not always beneficial"
  - "Accepted at AAAI 2026 (Oral)"
tags:
  - multi-agent
  - debate
  - consensus
  - token-efficiency
created: 2026-04-30
updated: 2026-04-30
status: ingested

---# iMAD: Intelligent Multi-Agent Debate

Fan et al., AAAI 2026 (Oral).

## Core Idea

Multi-Agent Debate (MAD) is powerful but expensive. Triggering it for every query is inefficient — it may even degrade accuracy by overturning correct answers. iMAD selectively triggers debate only when likely to be beneficial.

## Mechanism

1. Single agent produces structured self-critique response
2. Extract 41 interpretable linguistic and semantic features (hesitation cues)
3. Lightweight debate-decision classifier (FocusCal loss) determines whether to trigger MAD
4. No test dataset-specific tuning required

## Results

| Metric | Improvement |
|--------|-------------|
| Token reduction | Up to 92% |
| Accuracy improvement | Up to 13.5% |
| Generalization | Across 6 QA datasets, 5 baselines |

## Key Insight

> Debate can overturn correct single-agent answers. Selective routing is essential for both cost and accuracy.

This directly challenges our consensus debate design (ADR-011, Phases 14-15), which currently assumes debate is always beneficial and always worth the token cost. iMAD suggests we need a **debate-gating classifier** that determines whether a given spec/plan/implementation NEEDS debate.

## Relevance to Our Consensus Debate (Phases 14-15)

Current ADR-011 design: debate always on for L1/L2/L4. iMAD suggests:

1. **Pre-debate classifier**: Before spawning debate, single agent self-critiques. If confidence is high and no hesitation cues detected, skip debate entirely.
2. **Token savings**: 92% token reduction on unnecessary debates — directly addresses ADR-011's ~13,000 token added cost.
3. **Accuracy guard**: Classifier prevents debate from overturning correct answers.
