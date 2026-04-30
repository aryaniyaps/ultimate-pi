---
type: concept
title: "Self-Evolving Harness"
created: 2026-04-30
updated: 2026-04-30
status: seed
tags:
  - harness
  - auto-evolution
  - meta-learning
related:
  - "[[agentic-harness]]"
  - "[[harness-implementation-plan]]"
  - "[[model-adaptive-harness]]"
sources:
  - "[[lou2026-autoharness]]"
  - "[[lee2026-meta-harness]]"
  - "[[meng2026-agent-harness-survey]]"
---

# Self-Evolving Harness

The concept that a harness can automatically improve itself through iterative refinement, execution traces, and outer-loop optimization — rather than requiring manual human engineering.

## Two Approaches

### AutoHarness (Lou et al., 2026)
- Small model generates harness code iteratively
- Environment provides feedback (illegal move detection, scores)
- LLM refines harness from failure signals
- Result: synthesized harness + small model beats large model bare

### Meta-Harness (Lee et al., 2026)
- Outer-loop system searches over harness code
- Agentic proposer accesses ALL prior candidates (code, traces, scores)
- Filesystem-based memory of experiments
- Surpasses hand-engineered baselines on TerminalBench-2

## What Can Evolve

From the Self-Evolving Agents Survey (Gao et al., 2026):
- **Models**: Fine-tuning from agent experience
- **Memory**: What to store, how to retrieve
- **Tools**: Which tools to use, how to invoke them
- **Architecture**: Agent topology, routing decisions

## Relevance to Our Harness

Our harness is currently static — manually designed skill files, schemas, gates. Self-evolution suggests:

1. **Token budget auto-tuning**: Actual vs. budgeted token usage per layer → adjust budgets automatically
2. **Gate threshold auto-tuning**: Which gates catch real issues vs. false positives → remove unnecessary gates
3. **Model profile auto-learning**: Instead of hand-coding model profiles (opus/gpt/gemini), learn from execution traces
4. **Debate routing**: Auto-decide whether a spec/plan/implementation needs debate (cf. iMAD selective debate)

## Risks

- Self-modifying harnesses can introduce bugs
- Auto-removing gates may remove safety-critical checks
- Meta-harness optimization may overfit to specific benchmarks
- Needs safety bounds: which components can self-evolve vs. must remain manually controlled
