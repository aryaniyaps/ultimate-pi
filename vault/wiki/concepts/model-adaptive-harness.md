---
type: concept
title: "Model-Adaptive Agent Harness"
aliases: ["adaptive harness", "model-aware harness"]
created: 2026-04-30
updated: 2026-04-30
tags: [concept, agents, harness-design, model-awareness]
status: active
related:
  - "[[harness-configuration-layers]]"
  - "[[Research: Model-Adaptive Agent Harness Design]]"
  - "[[forgecode-gpt5-agent-improvements]]"
  - "[[harness-implementation-plan]]"
  - "[[drift-detection-unified]]"
---

# Model-Adaptive Agent Harness

An agent harness that varies its behavior based on which LLM is driving it. Not a one-size-fits-all instruction set — a configurable system of signals, gates, channels, and completion criteria that adapts to each model's specific failure modes.

> [!tip] See [[harness-configuration-layers]] for the detailed per-dimension comparison tables (Signal, Gate, Channel, Completion) across Opus, GPT, Gemini, and Strict profiles.

## Why

Forge Code demonstrated that GPT 5.4 and Opus 4.6 reached identical benchmark scores (81.8% on TermBench 2.0) only after the harness was adapted to each model. Drop both into the same harness and Opus looks easier. Adapt the harness and the gap disappears.

The models fail differently:
- **GPT**: Anchors on first-seen content, gets confused by nested structures, misses metadata signals, stops after plausible-but-incomplete solutions. Needs flat structure, constraints-first ordering, enforced hard gates, in-band signaling.
- **Opus/Claude**: Infers from structure, tolerates nesting, reads metadata, naturally double-checks. Tolerates hierarchical instructions, soft gates, metadata-based state channels.
- **Gemini**: Profile TBD — needs validation against actual agent trajectories.

## Key Principle

**Write once for the strictest model (GPT-safe defaults). Relax for forgiving models. Never write for forgiving and hope strict models cope.**

The canonical harness instructions are written in "strict mode" (GPT-safe): flat structure, constraints-first, explicit markers, enforced hard gates, in-band signals. Opus/Claude profiles receive relaxations — they may skip explicit markers, use narrative self-assessment, and trust metadata for state signals.

## Four-Layer Configuration Model

```
L4 COMPLETION MODEL — How "done" is determined and verified
L3 STATE CHANNEL    — How system state reaches the model
L2 GATE DESIGN      — How transitions between phases are controlled
L1 SIGNAL DESIGN    — How instructions are formatted for model consumption
```

Each layer has configurable dimensions that vary by model profile. See [[harness-configuration-layers]] for the full comparison table showing all 16 dimension variations across 4 model profiles.

## What Never Adapts

Core invariants across all profiles — these are enforced by the pipeline structure, not by model-specific instructions:

- Pipeline phase ordering and layer requirements
- Quality standards and source attribution requirements
- Confidence labeling
- Budget constraints (max rounds, max tokens, max pages)
- Verification requirements (what must be checked, even if how varies)
- Read-first/write-after wiki contract
- No-skip rule (verification is mandatory)

## Model-Specific Adaptations (Summary)

| Behavior | Opus/Claude | GPT | Gemini |
|----------|-------------|-----|--------|
| Structure | Tolerates nesting, natural flow | Needs flat, constraints-first | TBD |
| Truncation | Infers from metadata | Needs body-text in-band warning | TBD |
| Verification | Naturally double-checks | Must be ENFORCED (hard gate) | TBD |
| Completion | Self-aware of gaps | Stops after plausible-but-incomplete | TBD |
| Emphasis | Contextual cues work | Explicit markers (REQUIRED, MANDATORY) | TBD |
| Drift detection | LLM-based every 15 steps | Rule-based every step | Rule-based every 10 steps |

## Application to Harness Pipeline

Each pipeline phase that generates agent-facing instructions varies based on the driving model profile:
- **L1 Spec Hardening**: Instruction density, constraint ordering, emphasis markers
- **L2 Structured Planning**: Gate enforcement (hard checklist vs soft self-assessment), granularity (per-step vs per-round)
- **L2.5 Drift Monitor**: Detection frequency (per-step rule-based vs every-15-step LLM-based), escalation aggression
- **L3 Grounding Checkpoints**: Truncation signaling (in-band warning vs metadata), progress indicators (explicit counters vs implicit)
- **L4 Adversarial Verification**: Completion criteria (falsifiable checklist vs completion-signal), self-audit (enforced vs natural)

## Source

Derived from Forge Code's TermBench 2.0 findings: https://forgecode.dev/blog/gpt-5-4-agent-improvements/
