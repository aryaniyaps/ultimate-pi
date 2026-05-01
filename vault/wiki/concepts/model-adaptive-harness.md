---
type: concept
title: "Model-Adaptive Agent Harness"
aliases: ["adaptive harness", "model-aware harness"]
created: 2026-04-30
updated: 2026-05-01
tags: [concept, agents, harness-design, model-awareness]
status: redesign
related:
  - "[[provider-native-prompting]]"
  - "[[harness-configuration-layers]]"
  - "[[Research: Model-Specific Prompting Guides]]"
  - "[[forgecode-gpt5-agent-improvements]]"
  - "[[harness-implementation-plan]]"
  - "[[codex-harness-innovations]]"
  - "[[codex-open-source-agent-2026]]"
  - "[[openai-prompt-guidance]]"
  - "[[anthropic-prompt-best-practices]]"
  - "[[gemini-3-prompting-guide]]"
sources:
  - "[[openai-prompt-guidance]]"
  - "[[anthropic-prompt-best-practices]]"
  - "[[gemini-3-prompting-guide]]"
  - "[[forgecode-gpt5-agent-improvements]]"
---

# Model-Adaptive Agent Harness

An agent harness that generates **provider-native prompts** optimized for each model's official prompting conventions — not a single canonical format with strictness relaxations.

> [!important] REDESIGN: May 2026 — The original design ("write once for strictest, relax for forgiving") has been replaced. Official provider guidance shows that models need fundamentally different prompt formats, not just different strictness levels. See [[provider-native-prompting]] and [[Research: Model-Specific Prompting Guides]].

## Why This Exists

Forge Code demonstrated that GPT 5.4 and Opus 4.6 reached identical benchmark scores (81.8% on TermBench 2.0) only after the harness was adapted to each model. This proved that adaptation matters.

But Forge Code's approach was empirical: observe failure modes, then compensate. Each provider now publishes OFFICIAL guidance on how to prompt their models correctly. These guides should be the PRIMARY source for harness adaptations.

## Design Principle (v2 — May 2026)

**Generate provider-native prompts from a provider-agnostic semantic specification. Never generate a single canonical prompt and relax it.**

The harness's internal representation is a semantic spec (WHAT must be communicated). The prompt renderer generates actual prompt text according to the target model's provider conventions (HOW it's communicated).

See [[provider-native-prompting]] for the full architecture and renderer design.

## Provider Profiles (Official Guidance)

### OpenAI GPT-5.x
- **Structure**: XML-like sections, constraints-first ordering
- **Density**: Outcome-first, concise. Describe destination, not journey
- **Verification**: Pre-flight/post-flight action safety blocks
- **Thinking**: reasoning_effort parameter (none/low/medium/high/xhigh)
- **Tools**: apply_patch native, shell_command, update_plan
- **Key rule**: Contradictory instructions actively harm GPT-5+ reasoning
- **Source**: [[openai-prompt-guidance]]

### Anthropic Claude 4.x
- **Structure**: XML tags, long content at TOP, query at BOTTOM
- **Density**: General instructions over prescriptive steps
- **Verification**: Self-check at end, role setting critical
- **Thinking**: Adaptive thinking with effort parameter (max/xhigh/high/medium/low)
- **Tools**: Explicit tool direction, text_editor, bash
- **Key rule**: Be explicit; don't infer intent from vague prompts
- **Source**: [[anthropic-prompt-best-practices]]

### Google Gemini 3
- **Structure**: Plain text, constraints at END (not beginning)
- **Density**: Concise by default, must explicitly steer for verbosity
- **Verification**: Split-step: verify capability → then generate
- **Thinking**: thinking level LOW/HIGH, system instructions
- **Temperature**: **1.0 MANDATORY** — never change
- **Key rule**: Persona definitions are binding; model treats them seriously
- **Source**: [[gemini-3-prompting-guide]]

> [!gap] Empirical failure mode data (from Forge Code) should be layered ON TOP of official guidance, not used as the foundation. The old design was reversed.

## What Never Adapts

Core invariants across all profiles — enforced by pipeline structure, not model-specific instructions:

- Pipeline phase ordering and layer requirements
- Quality standards and source attribution requirements
- Confidence labeling
- Budget constraints (max rounds, max tokens, max pages)
- Verification requirements (what must be checked, even if how varies)
- Read-first/write-after wiki contract
- No-skip rule (verification is mandatory)

## Application to Harness Pipeline

Each pipeline layer generates a fragment of the semantic spec. The renderer produces the actual prompt:

- **L1 Spec Hardening**: Task definition, acceptance criteria → rendered per provider conventions
- **L2 Structured Planning**: Task DAG, dependencies → constraint ordering per provider
- **L2.5 Drift Monitor**: Detection strategy → split-step (Gemini), self-check (Claude), loop (GPT)
- **L3 Grounding Checkpoints**: Verification steps → grounding mechanism per provider
- **L4 Adversarial Verification**: Attack vectors → verification workflow per provider
- **L5-L8**: Observability, memory, orchestration, query → rendered per provider

## Implementation

New module: **Prompt Renderer** (Phase P22b in [[harness-implementation-plan]])

```
Semantic Spec → Prompt Renderer → Provider-Native Prompt
                ├── openai-renderer
                ├── anthropic-renderer  
                └── google-renderer
```

- `lib/renderers/openai.ts` — XML-like sections, constraints-first, preambles
- `lib/renderers/anthropic.ts` — XML tags, long-content-top, role setting
- `lib/renderers/google.ts` — Plain text, constraints-last, grounding statements
- `lib/renderers/fallback.ts` — Conservative markdown for unknown models

## Sources

- [[openai-prompt-guidance]] — OpenAI official, 2026
- [[anthropic-prompt-best-practices]] — Anthropic official, 2026
- [[gemini-3-prompting-guide]] — Google Cloud official, 2026-04-29
- [[forgecode-gpt5-agent-improvements]] — Forge Code empirical, 2026
