---
type: concept
title: "Harness Configuration Layers"
aliases: ["four-layer harness", "harness layers", "L1-L4 harness"]
created: 2026-04-30
updated: 2026-04-30
tags: [#concept, #agents, #harness-design]
status: developing
related:
  - "[[model-adaptive-harness]]"
  - "[[forgecode-gpt5-agent-improvements]]"
  - "[[Research: Model-Adaptive Agent Harness Design]]"
---

# Harness Configuration Layers

A four-layer model for agent harness design. Each layer has configurable dimensions that vary by LLM model. Based on Forge Code's finding that the same harness produces different reliability across models — and that exposing these as configuration (not hardcoding them) is what separates brittle harnesses from reliable ones.

## Layer Architecture

```
L4 COMPLETION MODEL — How "done" is determined and verified
L3 STATE CHANNEL    — How system state reaches the model
L2 GATE DESIGN      — How transitions between phases are controlled
L1 SIGNAL DESIGN    — How instructions are formatted for model consumption
```

## L1: Signal Design

How instructions, constraints, and structure are formatted.

| Dimension | Opus/Claude | GPT | Why |
|---|---|---|---|
| Density | concise | verbose | GPT needs repetition; Opus infers |
| Constraint Ordering | natural-flow | constraints-first | GPT weights early tokens higher |
| Emphasis | contextual | explicit-markers | GPT responds to `REQUIRED:`; Opus reads intent |
| Nesting Depth | hierarchical | flat | GPT confused by nested structures |
| Atomicity | compound | atomic | GPT does first directive, stops |

## L2: Gate Design

How transitions between phases are controlled.

| Dimension | Opus/Claude | GPT | Why |
|---|---|---|---|
| Enforcement | soft-gate | hard-gate | GPT stops early without enforced gates |
| Granularity | per-round | per-step | GPT needs frequent drift-prevention |
| Evidence | self-assessment | checklist | GPT self-assessment is confidently wrong |
| Retry | flag-and-continue | auto-loop | GPT chooses "continue" over "retry" |

## L3: State Channel

How system state reaches the model.

| Dimension | Opus/Claude | GPT | Why |
|---|---|---|---|
| Truncation | metadata | in-band | GPT ignores metadata fields |
| Progress | implicit | explicit-counters | GPT loses track in long trajectories |
| Error | natural | structured | GPT handles structured errors better |

## L4: Completion Model

How "done" is determined.

| Dimension | Opus/Claude | GPT | Why |
|---|---|---|---|
| Criteria | completion-signal | falsifiable-checklist | GPT's "I'm done" is unreliable |
| Self-Audit | natural | enforced | GPT must be forced into reviewer mode |
| Partial-Work | accept-with-gaps | reject | GPT partial work looks complete but isn't |

## Design Principle

**Write once for strict (GPT-safe defaults). Relax for forgiving models.** The cost of over-specifying is minor (extra tokens). The cost of under-specifying is broken agent loops.

## Source

Derived from Forge Code's TermBench 2.0 findings: https://forgecode.dev/blog/gpt-5-4-agent-improvements/
