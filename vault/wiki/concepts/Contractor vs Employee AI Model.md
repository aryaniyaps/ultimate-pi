---
type: concept
title: "Contractor vs Employee AI Model"
created: 2026-04-30
status: developing
tags:
  - ai-strategy
  - context
  - model-selection
aliases:
  - Context vs Intelligence
related:
  - "[[Context Engine (AI Coding)]]"
  - "[[Augment Code]]"
sources:
  - "[[Augment Code Codacy AI Giants]]"
updated: 2026-05-02

---# Contractor vs Employee AI Model

A mental model coined by Vinay Perneti (VP Engineering at Augment Code) that frames the relationship between LLM intelligence and codebase context in AI coding tools.

## The Analogy

| Aspect | Contractor | Employee |
|--------|-----------|----------|
| **Intelligence** | Has it (borrowed) | Has it |
| **Context** | Missing | Has it (accumulated over time) |
| **Result** | Needs constant re-explanation | Understands the codebase deeply |
| **AI equivalent** | Raw LLM with no codebase context | LLM + Context Engine |

## Why This Matters

Most AI coding tools focus on model intelligence — chasing higher benchmark scores by using more powerful models. Augment's insight: context is the bottleneck, not intelligence.

### Evidence
- Claude Opus 4.5 scored 45.89% through SWE-Agent (baseline context).
- Same model scored 51.80% through Auggie (semantic context).
- A weaker model (Sonnet) with Augment's context can outperform Opus without it.

## Practical Implications

### For Tool Builders
- Invest in context infrastructure before chasing model upgrades.
- Build contextual understanding that persists across sessions.
- Treat context as a first-class engineering problem, not an afterthought.

### For Model Selection
- Augment offers only 3 model choices (vs competitors' 20+).
- Philosophy: "Let us solve the hard problems of what models make sense. You shouldn't spend mental cycles on how to get the best context."

### For Our Harness
- Context layer should be independent of model layer.
- Swap models without rebuilding context infrastructure.
- Invest in semantic indexing, knowledge persistence, and pattern recognition before model optimization.
