---
type: concept
title: "Model-Adaptive Agent Harness"
aliases: ["adaptive harness", "model-aware harness"]
created: 2026-04-30
updated: 2026-04-30
tags: [#concept, #agents, #harness-design, #model-awareness]
status: developing
related:
  - "[[harness-configuration-layers]]"
  - "[[forgecode-gpt5-agent-improvements]]"
  - "[[Research: Model-Adaptive Agent Harness Design]]"
---

# Model-Adaptive Agent Harness

An agent harness that varies its behavior based on which LLM is driving it. Not a one-size-fits-all instruction set — a configurable system of signals, gates, channels, and completion criteria that adapts to each model's specific failure modes.

## Why

Forge Code demonstrated that GPT 5.4 and Opus 4.6 reached identical benchmark scores (81.8% on TermBench 2.0) only after the harness was adapted to each model. Drop both into the same harness and Opus looks easier. Adapt the harness and the gap disappears.

The models fail differently:
- GPT anchors on first-seen content, gets confused by nested structures, misses metadata signals, stops after plausible-but-incomplete solutions
- Opus infers from structure, tolerates nesting, reads metadata, naturally double-checks

## Key Principle

**Write once for the strictest model. Relax for forgiving models. Never write for forgiving and hope strict models cope.**

The canonical harness should be written in "strict mode" (GPT-safe): flat structure, constraints-first, explicit markers, enforced gates, in-band signals. Opus/Claude models receive relaxations — they may skip explicit markers, use narrative self-assessment instead of checklists, and trust metadata for state signals.

## What Adapts

The harness has four configurable layers (see [[harness-configuration-layers]]):

1. **Signal Design** — instruction density, ordering, emphasis, nesting
2. **Gate Design** — enforcement model, granularity, evidence standard
3. **State Channel** — how truncation, progress, errors reach the model
4. **Completion Model** — how "done" is determined and verified

Each layer has dimensions that vary by model profile (`opus`, `gpt`, `gemini`, `strict`).

## What Never Adapts

Core invariants across all profiles:
- Pipeline phase ordering
- Quality standards and source attribution requirements
- Confidence labeling
- Budget constraints (max rounds, max tokens, max pages)
- Verification requirements (what must be checked, even if how varies by model)
