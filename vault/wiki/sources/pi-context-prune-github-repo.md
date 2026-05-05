---
type: source
source_type: github-repo
title: "pi-context-prune — Tool-Call Batch Summarization"
author: championswimmer
date_published: 2026-03-01
date_accessed: 2026-05-05
url: "https://github.com/championswimmer/pi-context-prune"
confidence: medium
tags:
  - pi-agent
  - compaction
  - extensions
  - context-pruning
key_claims:
  - "Summarizes tool-call batches and prunes verbose outputs"
  - "Preserves originals in session index for on-demand recovery"
  - "Five trigger modes for flexible compaction timing"
  - "Integrates with prefix caching for improved token efficiency"
---

# pi-context-prune

## Summary

pi-context-prune addresses context bloat by summarizing tool-call batches and pruning verbose outputs while preserving originals in the session index for on-demand recovery. Supports 5 trigger modes and integrates with prefix caching.

## Approach

Operates between pi-vcc (full conversation compaction) and pi-rtk-optimizer (tool output compaction). Targets specifically tool-call batches — groups of related tool calls that can be summarized together — rather than the entire conversation or individual tool outputs.

## Key Differentiator

Preserves originals for recovery, similar to pi-vcc's recall capability. However, uses LLM summarization for the compression step itself. Prefix caching integration is unique among Pi compaction extensions.

## Relevance to pi-vcc

Complementary. pi-context-prune operates on tool-call batches mid-session. pi-vcc operates on full conversation at compaction triggers. Different granularity, different timing.
