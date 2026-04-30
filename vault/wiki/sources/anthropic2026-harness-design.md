---
type: source
source_type: blog
title: "Harness Design for Long-Running Application Development"
author: "Prithvi Rajasekaran, Anthropic Engineering"
date_published: 2026-03-24
url: "https://www.anthropic.com/engineering/harness-design-long-running-apps"
confidence: high
key_claims:
  - "Self-evaluation is fundamentally broken: agents praise their own mediocre work"
  - "Separating generator from evaluator (GAN-inspired) dramatically improves output quality"
  - "Sprint contracts: agree on 'done' before writing code"
  - "Harness simplification: as models improve, remove non-load-bearing components"
  - "Cost: 20x more expensive but dramatically better quality"
tags:
  - harness
  - anthropic
  - multi-agent
  - evaluator
  - generator
created: 2026-04-30
updated: 2026-04-30
status: ingested
---

# Harness Design for Long-Running Application Development

Anthropic Engineering, March 2026. Prithvi Rajasekaran.

## Three-Agent Architecture

**Planner**: Takes 1-4 sentence prompt → full product spec. Stays at product-context level, avoids granular technical details to prevent cascading errors.

**Generator**: Implements one feature at a time. Self-evaluates after each sprint before handing off.

**Evaluator**: Uses Playwright MCP to interactively test the running application. Grades against explicit criteria (design quality, originality, craft, functionality). Each criterion has a hard threshold — if any falls below, sprint fails.

## Critical Findings

### Self-Evaluation Is Broken
When asked to evaluate their own work, agents "respond by confidently praising the work — even when, to a human observer, the quality is obviously mediocre." Separating generator from evaluator is essential.

### Context Anxiety
Models start wrapping up prematurely when approaching context limit. Compaction alone insufficient — context resets with structured handoffs required for Sonnet 4.5. Opus 4.5+ largely fixed this.

### Evaluator Tuning
Claude is "a poor QA agent out of the box" — identifies flaws then talks itself out of flagging them. Needs explicit tuning to be skeptical. Multiple rounds of development loop required.

### Sprint Contracts
Before each sprint, generator and evaluator negotiate a contract defining what "done" looks like. Generator proposes, evaluator reviews. They iterate until agreement. Communication via files.

### Harness Simplification Principle
"Every component in a harness encodes an assumption about what the model can't do on its own, and those assumptions are worth stress testing." When Opus 4.6 arrived, sprint construct was removed (model handled decomposition natively). Evaluator became conditional — worth the cost only when task sits beyond what the model does reliably solo.

## Results

| Harness | Duration | Cost | Quality |
|---------|----------|------|---------|
| Solo | 20 min | $9 | Core feature broken |
| Full harness | 6 hr | $200 | All features working, AI integration |

## Key Takeaway

"The space of interesting harness combinations doesn't shrink as models improve. Instead, it moves."
