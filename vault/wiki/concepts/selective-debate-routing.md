---
type: concept
title: "Selective Debate Routing"
created: 2026-04-30
updated: 2026-04-30
status: active
tags:
  - debate
  - consensus
  - token-efficiency
  - multi-agent
related:
  - "[[consensus-debate]]"
  - "[[adr-011]]"
  - "[[harness-implementation-plan]]"
sources:
  - "[[fan2025-imad]]"

---# Selective Debate Routing

The practice of triggering multi-agent debate only when likely to be beneficial, rather than for every query. From iMAD (Fan et al., AAAI 2026).

## Core Insight

> Multi-Agent Debate can overturn correct single-agent answers. Always-on debate wastes tokens AND can reduce accuracy.

## iMAD Mechanism

1. Single agent produces structured self-critique response
2. Extract 41 linguistic/semantic features (hesitation cues):
   - Uncertainty markers ("might", "could be", "I think")
   - Contradictory statements
   - Missing evidence references
   - Low confidence indicators
3. Lightweight classifier (FocusCal loss) → debate or skip
4. Generalizes across datasets without per-task tuning

## Results

- **92% token reduction** vs always-debate
- **13.5% accuracy improvement** vs single-agent
- Works across 6 QA datasets, 5 baselines

## Impact on Our Consensus Debate (ADR-011)

Current ADR-011 design assumes:
- Debate always beneficial
- Always worth the ~13,000 token cost per subtask
- Always improves over single-pass review

iMAD suggests we should:
1. Add a **pre-debate gate**: single agent self-critiques first
2. If confidence is high + no hesitation cues → skip debate, save tokens
3. If uncertainty detected → trigger debate
4. This could reduce debate token cost by up to 92% on high-confidence tasks

## Implementation Sketch

```
Task → Single agent self-critique → Extract hesitation features
  ├─ High confidence → Skip debate, proceed
  └─ Uncertainty detected → Trigger consensus debate (per ADR-011)
       └─ Consensus reached → File winning position to wiki/consensus/ (mandatory, per [[consensus-debate]])
```

## Open Questions

- Do hesitation cues in code review differ from QA tasks?
- Can a single classifier work across L1 (spec), L2 (plan), L4 (code) debates?
- Should the classifier be model-specific (different models show different hesitation patterns)?
