---
type: synthesis
title: "Research: Model-Adaptive Agent Harness Design"
created: 2026-04-30
updated: 2026-04-30
tags:
  - research
  - agents
  - harness-design
  - model-awareness
status: complete
related:
  - "[[model-adaptive-harness]]"
  - "[[harness-configuration-layers]]"
  - "[[forgecode-gpt5-agent-improvements]]"
sources:
  - "[[forgecode-gpt5-agent-improvements]]"
---

# Research: Model-Adaptive Agent Harness Design

## Overview

Forge Code's TermBench 2.0 results reveal that agent harness reliability is not a property of the model — it's a property of how well the harness compensates for each model's specific failure modes. GPT 5.4 and Opus 4.6 reached identical 81.8% scores only after model-specific adaptation. This research documents the design principles for making the harness pipeline model-aware.

## Key Findings

- **The harness has four configurable layers** not previously recognized: Signal Design (L1), Gate Design (L2), State Channel (L3), Completion Model (L4). Each has dimensions that vary by model (Source: [[forgecode-gpt5-agent-improvements]])

- **GPT and Opus fail differently but reach the same capability ceiling** when the harness compensates. GPT needs flat structure, constraints-first ordering, enforced gates, in-band signals. Opus tolerates nesting, infers from metadata, self-corrects (Source: [[forgecode-gpt5-agent-improvements]])

- **Enforced verification is the single biggest improvement.** GPT stops after plausible-but-incomplete solutions. "Please verify" does nothing. A programmatic gate — checklist that must be passed before proceeding — catches gaps (Source: [[forgecode-gpt5-agent-improvements]])

- **Schema/instruction shape is a reliability variable, not cosmetic.** GPT anchors on what appears first. Moving constraints before descriptive content reduces malformed behavior. Flat structures (1 nesting level) reduce structural errors. Same semantics, different reliability (Source: [[forgecode-gpt5-agent-improvements]])

- **Truncation signaling must be in-band for GPT.** Metadata fields like `total_lines` are invisible to GPT's attention. Body-text warnings are necessary. Opus reads metadata fine (Source: [[forgecode-gpt5-agent-improvements]])

## Key Entities

- [[forgecode-gpt5-agent-improvements|ForgeCode]]: Agent coding platform that reached #1 on TermBench 2.0. Published the model-adaptive harness findings
- Tushar Mathur: Author of the Forge Code blog post and lead on the harness adaptation work

## Key Concepts

- [[model-adaptive-harness]]: Harness that varies behavior by model profile, not a one-size-fits-all instruction set
- [[harness-configuration-layers]]: Four-layer framework (L1 Signal, L2 Gate, L3 Channel, L4 Completion) with configurable dimensions per model

## Design Principles for the Harness Pipeline

These findings will be applied to the harness pipeline as it is built out. The key principle: **write once for strict (GPT-safe defaults), relax for forgiving models**. Never write for forgiving and hope strict models cope.

### Four-Layer Model (see [[harness-configuration-layers]] for full specification)

1. **L1 Signal Design** — instruction density, ordering, emphasis, nesting depth, atomicity
2. **L2 Gate Design** — enforcement model (hard vs soft), granularity, evidence standard, retry behavior
3. **L3 State Channel** — how truncation, progress, and errors are communicated to the model
4. **L4 Completion Model** — how "done" is determined and verified

### Model-Specific Differences

| Behavior | Opus/Claude | GPT |
|---|---|---|
| Structure | Tolerates nesting, natural flow | Needs flat, constraints-first |
| Truncation | Infers from metadata | Needs body-text warning |
| Verification | Naturally double-checks | Must be ENFORCED (hard gate) |
| Completion | Self-aware of gaps | Stops after plausible-but-incomplete |
| Emphasis | Contextual cues work | Explicit markers (REQUIRED, MANDATORY) |

### What Must Adapt per Model

Each pipeline phase that generates instructions for the agent should vary based on the driving model:
- Instruction formatting (density, ordering, emphasis)
- Gate enforcement (hard vs soft, checklist vs self-assessment)
- State signaling (in-band vs metadata, explicit vs implicit progress)
- Completion criteria (falsifiable checklist vs completion signal)

### What Never Adapts

Core invariants across all model profiles:
- Pipeline steps and phase ordering
- Quality standards and source attribution requirements
- Confidence labeling
- Budget constraints (max rounds, max tokens, max pages)
- Verification gates (what must be checked, even if how varies by model)

## Open Questions

- How to detect model at runtime? System prompt parsing? Tool-call format detection?
- Should per-step gates be added for GPT profile, or is per-round sufficient?
- How do these findings apply across all harness phases beyond research?
- Gemini profile needs validation against actual Gemini agent trajectories
- Should the harness maintain per-model reliability metrics to track which compensations work?

## Sources

- [[forgecode-gpt5-agent-improvements]]: Tushar Mathur, 2026-03-16. Primary source for all four fixes and model behavioral differences
