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

Forge Code's TermBench 2.0 results reveal that agent harness reliability is not a property of the model — it's a property of how well the harness compensates for each model's specific failure modes. GPT 5.4 and Opus 4.6 reached identical 81.8% scores only after model-specific adaptation. This research applied those findings to the autoresearch skill's harness, redesigning it from a fixed script into a four-layer configurable system with model profiles.

## Key Findings

- **The harness has four configurable layers** not previously recognized: Signal Design (L1), Gate Design (L2), State Channel (L3), Completion Model (L4). Each has dimensions that vary by model (Source: [[forgecode-gpt5-agent-improvements]])

- **GPT and Opus fail differently but reach the same capability ceiling** when the harness compensates. GPT needs flat structure, constraints-first ordering, enforced gates, in-band signals. Opus tolerates nesting, infers from metadata, self-corrects (Source: [[forgecode-gpt5-agent-improvements]])

- **Enforced verification is the single biggest improvement.** GPT stops after plausible-but-incomplete solutions. "Please verify" does nothing. A programmatic gate — checklist that must be passed before proceeding — catches gaps. This applies directly to the autoresearch Pre-File Verification Gate (Source: [[forgecode-gpt5-agent-improvements]])

- **Schema/instruction shape is a reliability variable, not cosmetic.** GPT anchors on what appears first. Moving `REQUIRED` constraints before descriptive content reduces malformed behavior. Flat structures (1 nesting level) reduce structural errors. Same semantics, different reliability (Source: [[forgecode-gpt5-agent-improvements]])

- **Truncation signaling must be in-band for GPT.** Metadata fields like `total_lines` are invisible to GPT's attention. Body-text warnings ("... truncated N lines") are necessary. Opus reads metadata fine. This applies to the autoresearch truncation warning rule (Source: [[forgecode-gpt5-agent-improvements]])

## Key Entities

- [[forgecode-gpt5-agent-improvements|ForgeCode]]: Agent coding platform that reached #1 on TermBench 2.0. Published the model-adaptive harness findings
- Tushar Mathur: Author of the Forge Code blog post and lead on the harness adaptation work

## Key Concepts

- [[model-adaptive-harness]]: Harness that varies behavior by model profile, not a one-size-fits-all instruction set
- [[harness-configuration-layers]]: Four-layer framework (L1 Signal, L2 Gate, L3 Channel, L4 Completion) with configurable dimensions per model

## Design Applied

The autoresearch skill was redesigned:

1. **L1 Signal Design**: Skill rewritten in strict mode — flat structure (H3 max), `REQUIRED:` before description, atomic instructions, explicit markers throughout
2. **L2 Gate Design**: Round-completion gate (3-question hard gate after each round). Pre-File Verification Gate (10-item checklist, no opt-out for gpt/strict)
3. **L3 State Channel**: Explicit truncation warning rule with body-text format. Explicit progress counters (round N/3, sources N/5)
4. **L4 Completion Model**: "YOU ARE DONE WHEN" falsifiable criteria. Post-file self-check (3 verification items). Hard gate for gpt/strict

**Profile resolution**: `program.md → model_profile → model-profiles.md → dimension values`

**Opus relaxations**: Narrative self-assessment instead of checklists. Metadata inference for truncation. Natural completion signals. Core pipeline steps NEVER relax.

## Configuration Files Created

- `references/harness-config.md`: Full four-layer dimension specification
- `references/model-profiles.md`: Concrete profiles (opus, gpt, gemini, strict) with per-dimension values
- `program.md`: Updated with `model_profile` config and reference links
- `SKILL.md`: Rewritten as strict-mode canonical template with opus relaxation annotations

## Open Questions

- How to detect model at runtime for `auto` profile? System prompt parsing? Tool-call format detection?
- Should per-step gates (between fetch and extract, between extract and synthesize) be added for gpt profile, or is per-round sufficient?
- How do these findings apply to other skills beyond autoresearch? The four-layer model is general — should it be extracted as a cross-skill harness framework?
- Gemini profile is conservative (near-gpt). Needs validation against actual Gemini agent trajectories

## Sources

- [[forgecode-gpt5-agent-improvements]]: Tushar Mathur, 2026-03-16. Primary source for all four fixes and model behavioral differences
