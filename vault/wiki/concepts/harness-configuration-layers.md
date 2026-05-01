---
type: concept
title: "Harness Configuration Layers"
aliases: ["four-layer harness", "harness layers", "L1-L4 harness"]
created: 2026-04-30
updated: 2026-05-01
tags: [#concept, #agents, #harness-design]
status: redesign
related:
  - "[[provider-native-prompting]]"
  - "[[model-adaptive-harness]]"
  - "[[forgecode-gpt5-agent-improvements]]"
  - "[[Research: Model-Specific Prompting Guides]]"
sources:
  - "[[openai-prompt-guidance]]"
  - "[[anthropic-prompt-best-practices]]"
  - "[[gemini-3-prompting-guide]]"
  - "[[forgecode-gpt5-agent-improvements]]"
---

# Harness Configuration Layers

A four-layer model for agent harness design. Each layer has configurable dimensions that vary by LLM model. **Updated May 2026** with official provider guidance as the primary source, replacing the earlier empirical-only approach.

> [!important] The old design principle ("write once for strict, relax for forgiving") is retired. See [[provider-native-prompting]] for the replacement: generate provider-native prompts from a semantic spec.

## Layer Architecture

```
L4 COMPLETION MODEL — How "done" is determined and verified
L3 STATE CHANNEL    — How system state reaches the model
L2 GATE DESIGN      — How transitions between phases are controlled
L1 SIGNAL DESIGN    — How instructions are formatted for model consumption
```

## L1: Signal Design

How instructions, constraints, and structure are formatted.

| Dimension | OpenAI GPT | Anthropic Claude | Google Gemini | Source |
|---|---|---|---|---|
| Structure | XML-like sections | XML tags | Plain text sections | Official guides |
| Density | Concise, outcome-first (5.5+) | General over prescriptive | Concise by default | OpenAI 5.5 guide, Anthropic BP, Gemini 3 guide |
| Constraint Ordering | FIRST (early tokens weighted higher) | Flexible | LAST (constraints at end) | Forge Code, Gemini 3 guide |
| Emphasis | Explicit markers for invariants only | Role setting + why explanation | Persona definitions binding | All three guides |
| Nesting Depth | Flat (older GPT), relaxed (GPT-5.5+) | Hierarchical OK | Flat recommended | Forge Code, official guides |

## L2: Gate Design

How transitions between phases are controlled.

| Dimension | OpenAI GPT | Anthropic Claude | Google Gemini | Source |
|---|---|---|---|---|
| Enforcement | Hard-gate (verification loop) | Self-check at end | Split-step verify→generate | GPT-5.4 guide, Anthropic BP, Gemini 3 guide |
| Granularity | Per-step | Per-round (auto-calibrated) | Per-step | Forge Code, Anthropic BP |
| Evidence | Checklist + tool output | Self-assessment + quote extraction | Explicit capability verification | GPT-5.4 guide, Anthropic BP, Gemini 3 guide |
| Retry | Auto-loop (tool persistence rules) | Flag-and-continue (effort-controlled) | Escalate after 1-2 fallback strategies | GPT-5.4 guide, Anthropic BP, Gemini 3 guide |

## L3: State Channel

How system state reaches the model.

| Dimension | OpenAI GPT | Anthropic Claude | Google Gemini | Source |
|---|---|---|---|---|
| Truncation | In-band warning + compaction API | Context awareness (tracks own budget) | System instruction for budget | GPT guide, Anthropic BP |
| Progress | Explicit counters + user update spec | Auto-calibrated progress updates | Less verbose, steer explicitly | GPT-5.1 guide, Anthropic Opus 4.7, Gemini 3 guide |
| Error | Structured (phase parameter) | Natural (adaptive thinking) | System instruction routing | GPT-5.3 Codex, Anthropic BP |
| Grounding | Citation rules + retrieval budgets | Quote extraction from documents | Explicit "context is truth" statement | All three guides |

## L4: Completion Model

How "done" is determined.

| Dimension | OpenAI GPT | Anthropic Claude | Google Gemini | Source |
|---|---|---|---|---|
| Criteria | Falsifiable checklist + completeness contract | Completion-signal + self-check | Split-step verification pass | GPT-5.4, Anthropic BP, Gemini 3 guide |
| Self-Audit | Enforced (verification loop) | Natural (may need prompting) | Enforced (verify before generate) | GPT-5.4, Anthropic BP, Gemini 3 guide |
| Partial-Work | Reject (completeness contract) | Accept-with-gaps (autonomous continuation) | STOP if unverified | GPT-5.4, Anthropic BP, Gemini 3 guide |

## Design Principle (v2)

**Generate provider-native prompts from a semantic spec.** See [[provider-native-prompting]] for the renderer architecture.

## Sources

- [[openai-prompt-guidance]] — OpenAI official, 2026
- [[anthropic-prompt-best-practices]] — Anthropic official, 2026
- [[gemini-3-prompting-guide]] — Google Cloud official, 2026-04-29
- [[forgecode-gpt5-agent-improvements]] — Forge Code empirical failure modes, 2026
