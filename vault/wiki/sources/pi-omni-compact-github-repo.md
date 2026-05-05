---
type: source
source_type: github-repo
title: "pi-omni-compact — Large-Context Model Compaction"
author: Whamp
date_published: 2026-02-01
date_accessed: 2026-05-05
url: "https://github.com/Whamp/pi-omni-compact"
confidence: medium
tags:
  - pi-agent
  - compaction
  - extensions
  - large-context
key_claims:
  - "Replaces default compaction with a large-context model subprocess"
  - "Spawns separate Pi instance using 1M+ token model to read entire conversation"
  - "Hooks session_before_compact and session_before_tree events"
  - "Produces higher-fidelity summaries than default incremental summarization"
  - "v0.1.2, MIT license, 0 dependencies"
---

# pi-omni-compact

## Summary

pi-omni-compact replaces Pi's default compaction by spawning a separate Pi subprocess using a large-context model (1M+ tokens). Instead of incremental summarization, the entire conversation is read at once, producing higher-fidelity summaries.

## How It Works

Hooks two Pi events:
- `session_before_compact` — when context window fills
- `session_before_tree` — when user abandons a conversation branch

For both: analyzes session metadata, serializes conversation, resolves configured model with valid API key, spawns read-only Pi subprocess (with `read`, `grep`, `find`, `ls` tools only).

## Configuration

In `settings.json`:
- `models`: Ordered list of models to try (first with valid API key wins)
- `debugCompactions`: Save input/output JSON for diagnosis
- `minSummaryChars`: Minimum summary length (default 100)

## Key Differentiator

Takes the opposite approach from pi-vcc: uses MORE compute (large-context model) for HIGHER fidelity, vs pi-vcc's zero-compute deterministic extraction. This is LLM-maximalist compaction vs pi-vcc's LLM-free approach.

## Relevance

Represents the strongest competing philosophy to deterministic compaction. If large-context models become cheap enough, this approach may produce better results. However, it has pi-vcc's three failure modes: non-reproducibility, hallucination risk, and API cost.
