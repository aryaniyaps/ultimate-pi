---
type: source
source_type: blog
title: "Benchmarks Don't Matter — Until They Do (Part 2)"
author: Tushar Mathur (ForgeCode / Tailcall Inc.)
date_published: 2026-03-16
url: https://forgecode.dev/blog/gpt-5-4-agent-improvements/
confidence: high
key_claims:
  - "ForgeCode reached 81.8% on TermBench 2.0 with both GPT 5.4 and Opus 4.6 — after model-specific harness adaptation"
  - "GPT 5.4 is sensitive to field ordering in schemas: required before properties reduces malformed tool calls"
  - "GPT 5.4 gets confused by nested schemas: flattening reduces structural errors"
  - "GPT 5.4 needs in-band truncation signals (body text), cannot rely on metadata inference like Opus"
  - "GPT 5.4 requires enforced verification gates — suggestions don't work; the model stops after plausible-but-incomplete solutions"
  - "The difference is behavioral, not capability: same benchmark score when harness compensates"
  - "The frontier is not better models — it's better harnesses for the models we already have"
created: 2026-04-30
updated: 2026-04-30
status: ingested
tags: [#source/blog, #agents, #benchmarks, #harness-design]
---

# Benchmarks Don't Matter — Until They Do (Part 2)

Blog post by Tushar Mathur (ForgeCode) documenting how they reached #1 and #2 on TermBench 2.0 with two different models by adapting their agent harness to each model's specific failure modes.

## Core Finding

**Same benchmark score (81.8%), two different models, same harness — after model-specific adaptation.** The models didn't change. The harness did.

## Four Fixes Applied

### Fix 1: Field Ordering in Tool Schemas
GPT 5.4 is sensitive to where fields appear in JSON. Moving `required` before `properties` reduced malformed tool calls. The model anchors on what it sees first. Same semantics, different reliability.

### Fix 2: Flatten Nested Schemas
GPT 5.4 gets confused by nested `required` arrays — mixing up which belongs to which object. Flat schemas (single object layer, single `required` array) eliminated this failure mode.

### Fix 3: Make Truncation Impossible to Miss
Opus 4.6 inferred truncation from `total_lines` metadata. GPT 5.4 missed that inference and proceeded as if it had the full file. Adding plain-text "... truncated N more lines" in the body fixed it.

### Fix 4: Enforced Verification
GPT 5.4 would implement a solution, sound confident, and stop — even when the task wasn't complete. Building a verification skill and **enforcing it programmatically** (not just suggesting) caught gaps before exit. This was the single biggest improvement.

## Model Behavioral Differences

| Behavior | Opus 4.6 | GPT 5.4 |
|---|---|---|
| Schema tolerance | Tolerates messy schemas | Needs clean ordering + flat structure |
| Truncation | Infers from metadata | Needs explicit body-text signal |
| Verification | Naturally double-checks | Must be enforced programmatically |
| Completion | Self-aware of gaps | Stops after plausible solutions |

**Key insight**: "Drop both models into the same harness and Opus looks easier to work with. Adapt the harness to GPT 5.4's actual failure modes and the gap disappears."

## What Comes Next

The frontier is not better models — it's:
- Per-tool reliability tracking by model
- Schema-shape evals before new tools ship
- Verification-skill precision (when to enforce, when to skip)
- Trajectory-level analysis of stop-vs-continue decisions
- Provider-specific runtime defaults where failure modes differ
