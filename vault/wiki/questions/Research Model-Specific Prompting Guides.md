---
type: synthesis
title: "Research: Model-Specific Prompting Guides"
created: 2026-05-01
updated: 2026-05-01
tags:
  - research
  - prompting
  - model-specific
  - harness-redesign
status: developing
related:
  - "[[model-adaptive-harness]]"
  - "[[harness-configuration-layers]]"
  - "[[harness-implementation-plan]]"
  - "[[forgecode-gpt5-agent-improvements]]"
sources:
  - "[[openai-prompt-guidance]]"
  - "[[anthropic-prompt-best-practices]]"
  - "[[gemini-3-prompting-guide]]"
---

# Research: Model-Specific Prompting Guides

## Overview

Every major model provider now publishes official prompting guidance specific to their models. These guides describe HOW to prompt each model for best results — not just what the models fail at. The current harness design derives model profiles from Forge Code's empirical failure-mode observations. This research brings the OFFICIAL provider guidance as the primary source for harness adaptations.

## Key Finding: The Harness Must Be Redesigned

The current harness writes "strict mode" (GPT-safe defaults) as canonical and relaxes for forgiving models. This is WRONG according to official guidance. Each provider specifies fundamentally DIFFERENT prompting conventions — not just different strictness levels of the same format.

### What Providers Say vs What Harness Does

| Provider | Official Guidance | Current Harness Behavior |
|----------|------------------|------------------------|
| **OpenAI** | Outcome-first prompts, shorter, constraints-first ordering, preambles before tools, reasoning effort is primary knob | "Strict mode" — flat structure, constraints-first, enforced hard gates, in-band signals |
| **Anthropic** | XML tags for structure, long content at top + query at bottom, role setting critical, prefer general instructions over prescriptive steps, effort parameter controls thinking | "Relaxed mode" — hierarchical instructions, soft gates, metadata-based state channels |
| **Google** | Constraints at END (not beginning), split-step verification, temperature at 1.0, explicit grounding statements, persona definitions critical | No Gemini-specific profile; marked "TBD" |

### Critical Contradictions

1. **Constraint ordering**: OpenAI says constraints-FIRST. Google says constraints-LAST. The harness can't satisfy both with one canonical format.

2. **Prompt density**: OpenAI (GPT-5.5+) says SHORTER prompts, outcome-first. The harness's "strict mode" generates verbose, constraint-heavy prompts — exactly what OpenAI now recommends against.

3. **Structure format**: Anthropic recommends XML tags. OpenAI uses XML-like sections but also markdown. Google uses plain text sections. No single format works across all three.

4. **Temperature**: Google mandates 1.0. OpenAI/Anthropic don't specify. The harness needs model-specific temperature config.

5. **Verification strategy**: Google says split-step (verify first, then generate). Anthropic says self-check at end. OpenAI (GPT-5.4+) says verification loop before finalizing. Different workflows.

6. **Grounding**: Google requires explicit "context is only source of truth" statements. OpenAI uses citation rules. Anthropic uses document quote extraction. Different grounding mechanisms.

## Proposed Redesign: Provider-Native Prompt Generation

Instead of "write once, relax for forgiving models," the harness should generate **provider-native prompts** optimized for each model's official conventions.

### Design Principle (NEW)

**Generate model-specific prompts from a provider-agnostic semantic specification. Never generate a single canonical prompt and relax it.**

The harness's internal representation should be a semantic spec (what must be communicated), not a prompt string. The prompt renderer generates the actual prompt text according to the target model's provider conventions.

### Provider Profiles

#### OpenAI GPT-5.x Profile
```
STRUCTURE: XML-like sections (<instruction_spec>)
ORDERING: Constraints-first, then context, then task
DENSITY: Concise, outcome-oriented. Describe destination, not journey.
EMPHASIS: Explicit markers: REQUIRED, MANDATORY for true invariants
VERIFICATION: Action safety blocks, pre-flight/post-flight
TOOLS: apply_patch native, shell_command tool, update_plan
REASONING: Use reasoning_effort parameter, not prompt-level "think step by step"
TEMPERATURE: Unspecified (default)
CONTRADICTIONS: Audit prompts for conflicting instructions — harmful to GPT-5+
```

#### Anthropic Claude 4.x Profile
```
STRUCTURE: XML tags (<instructions>, <context>, <examples>)
ORDERING: Long content at TOP, query at BOTTOM
DENSITY: Prefer general instructions over prescriptive steps
EMPHASIS: Role setting, explain "why" behind instructions
VERIFICATION: Self-check at end against test criteria
TOOLS: Explicit tool direction, default_to_action or do_not_act
THINKING: Adaptive thinking with effort parameter
TEMPERATURE: Unspecified (removed from API, use effort)
HALLUCINATION: investigate_before_answering block
PARALLEL: Maximize parallel tool calls
```

#### Google Gemini 3 Profile
```
STRUCTURE: Plain text sections
ORDERING: Context → Task → Constraints AT END
DENSITY: Concise by default, steer for verbosity explicitly
EMPHASIS: Persona definitions are binding
VERIFICATION: Split-step: verify capability → generate answer
TOOLS: System instructions for steering
THINKING: thinking level LOW/HIGH
TEMPERATURE: 1.0 (MANDATORY — never change)
GROUNDING: Explicit "context is absolute limit of truth" statement
SYNTHESIS: "Based on the entire document above..." anchor phrase
```

## What Changes in the Harness

### L1: Spec Hardening
- **Before**: Generates spec hardening prompts in "strict mode" with flat structure
- **After**: Generates provider-native spec prompts using the appropriate format per model

### L2: Structured Planning
- **Before**: Gate enforcement varies (hard for GPT, soft for Claude)
- **After**: Gate enforcement follows provider conventions PLUS empirical failure mode data

### L2.5: Drift Monitor
- **Before**: Detection frequency varies by model
- **After**: Detection strategy varies by model (split-step for Gemini, self-check for Claude, verification loop for GPT)

### L3: Grounding Checkpoints
- **Before**: Truncation signaling varies (in-band vs metadata)
- **After**: Grounding mechanism varies (explicit grounding statement for Gemini, citation rules for GPT, quote extraction for Claude)

### L4: Adversarial Verification
- **Before**: Completion criteria vary (falsifiable checklist vs completion-signal)
- **After**: Verification workflow varies (split-step verify-then-generate for Gemini, pre-flight/post-flight for GPT, self-check for Claude)

### New: Prompt Renderer Module
A new module between the harness's semantic spec and the actual API call. Takes a provider-agnostic task specification and renders it into a provider-native prompt.

```
Semantic Spec → Prompt Renderer → Provider-Native Prompt → API Call
                ├── openai-renderer
                ├── anthropic-renderer
                └── google-renderer
```

## Entities
- [[OpenAI]]: Publisher of GPT model family and official prompt guidance
- [[Anthropic]]: Publisher of Claude model family and prompt engineering best practices
- [[Google Cloud]]: Publisher of Gemini model family and Gemini 3 prompting guide

## Key Concepts
- [[provider-native-prompting]]: New concept — generate prompts optimized for each provider's conventions
- [[prompt-renderer]]: New module — translates semantic specs to provider-native prompts
- [[model-adaptive-harness]]: Existing concept — needs significant redesign
- [[harness-configuration-layers]]: Existing concept — dimensions need provider-native mappings

## Contradictions
- **Constraint ordering**: OpenAI says first, Google says last. Cannot resolve — must generate different prompts per provider.
- **Prompt density**: OpenAI (5.5+) says shorter, harness says verbose strict mode. OpenAIs own newer guidance contradicts the harness's approach.
- **Verification workflow**: Three different verification patterns (split-step, self-check, verification loop) — all from official sources, all valid.

## Open Questions
- How to handle models that don't have official prompting guides (Mistral, DeepSeek, Llama)?
- Should the harness validate prompts against provider conventions before sending?
- How does prompt caching interact with provider-native prompt generation?
- Should the semantic spec be the same across all providers, or should it also vary?
- What happens when provider guidance changes? Automatic updates?

## Sources
- [[openai-prompt-guidance]]: OpenAI, 2026 — Comprehensive multi-model guidance
- [[anthropic-prompt-best-practices]]: Anthropic, 2026 — Claude Opus 4.7 through Haiku 4.5
- [[gemini-3-prompting-guide]]: Google Cloud, 2026-04-29 — Gemini 3 specific
