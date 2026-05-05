---
type: source
source_type: github-issue
title: "RFC: Deterministic Session Checkpoint v1 (DSC) — Codex"
author: "Community contributor"
date_published: 2026-03-20
date_accessed: 2026-05-05
url: "https://github.com/openai/codex/issues/8573"
confidence: medium
tags:
  - compaction
  - deterministic
  - codex
  - checkpoint
key_claims:
  - "Proposes replacing Codex's lossy LLM summarization with deterministic host-generated checkpoints"
  - "Checkpoint is derived from session event logs (rollout-*.jsonl) — zero LLM calls"
  - "Data model: Artifact (file URI + hash), FactRecord (VALID/SUSPECT), DecisionRecord"
  - "Stale derived facts auto-marked as SUSPECT after compaction"
  - "RFC closed as not_planned by OpenAI (2026-03-20)"
---

# Codex DSC RFC 8573 — Deterministic Session Checkpoint

## Summary

Community-authored RFC proposing that Codex replace its lossy LLM-based compaction with a deterministic checkpoint derived from session event logs. Closed by OpenAI as "not_planned" but the approach independently validates the pi-vcc pattern.

## Key Details

- **Problem**: Codex's auto-compaction causes agents to re-read files, re-derive known facts, and lose task awareness
- **Proposed solution**: `checkpoint_v1.json` — structured projection of session event log
- **Data model**: Artifact (file URI + content hash), FactRecord (status: VALID | SUSPECT, evidence refs), DecisionRecord (rationale + dependencies)
- **Key innovation**: SUSPECT marking — when a file changes after a fact was derived from it, the fact is automatically marked stale
- **Outcome**: Rejected by OpenAI

## Why This Matters

The DSC RFC validates pi-vcc's core thesis: deterministic compaction preserves more useful state than LLM summarization. Codex choosing NOT to implement it does not invalidate the pattern — it may reflect prioritization, not disagreement. The SUSPECT marking concept is novel and absent from pi-vcc.

> [!gap] OpenAI's rationale for closing the RFC is not documented publicly. May reflect architectural constraints in Codex's Rust core rather than disagreement with deterministic compaction.
