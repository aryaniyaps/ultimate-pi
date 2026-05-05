---
type: source
source_type: official-docs
title: "pi-mono compaction docs"
author: "badlogic/pi-mono maintainers"
date_published: 2026-05-05
date_accessed: 2026-05-05
url: "https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/compaction.md"
confidence: high
tags:
  - pi-agent
  - compaction
  - context-window
  - docs
key_claims:
  - "Pi core has built-in /compact and auto-compaction with token thresholds"
  - "Auto-compaction preserves recent tokens and summarizes older context"
  - "Compaction settings include enabled, reserveTokens, keepRecentTokens"
  - "pi-vcc can be evaluated as deterministic alternative/override to default flow"
---

# pi-mono Compaction Documentation

## Summary

Pi core already provides native conversation compaction. This matters for `pi-vcc` because it clarifies baseline behavior and where `pi-vcc` adds value: deterministic non-LLM compaction and recall across lineage.

## Key Details

- Core command: `/compact`
- Auto mode: `/autocompact`
- Trigger model: compaction activates near context limit based on configured token reserve
- Config knobs: `enabled`, `reserveTokens`, `keepRecentTokens`
- Scope: compaction and reload behavior in core Pi coding agent

## Why This Matters for Topic

`pi-vcc` is not mandatory to get compaction in Pi. It is a specialized replacement/augmentation path focused on determinism, speed, and recall ergonomics.
