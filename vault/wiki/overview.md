---
type: overview
title: "Ultimate-PI Harness Architecture Overview"
created: 2026-04-30
updated: 2026-04-30
status: active
tags: [meta, overview, harness, architecture]
---

# Ultimate-PI Harness Architecture Overview

## What This Is

The **ultimate-pi agentic harness** is a mandatory 8-layer pipeline with drift monitoring, cross-cutting tool enhancements, and persistent wiki-based memory. Every AI coding task flows through all layers. Verification is mandatory — agent confidence is not evidence.

## Architecture At a Glance

```
L1: Spec Hardening    → L2: Structured Planning  → L2.5: Runtime Drift Monitor
  ↓                         ↓                           ↓ (3 paradigms: tool-call, spec, implementation)
L3: Grounding Checkpoints  → L4: Adversarial Verification → Phase 16: Lint+Format Gate
  ↓ (with Think-in-Code, AST truncation, fuzzy edits,
     inline syntax validation, ck semantic search, Gitingest)
L5: Automated Observability → L6: Persistent Memory (Wiki) → L7: Archon Orchestration → L8: Wiki Query
```

## Key Numbers

- **~15,000-16,000 tokens/subtask** pipeline overhead (with all enhancements)
- **27 build phases** (P0-P27) + 3 future phases (F1-F3)
- **4 new tools**: ck (semantic search), Gitingest (bulk ingestion), pi-messenger (debate transport), pi-lean-ctx (compression+governance)
- **3 control frameworks**: H=(E,T,C,S,L,V), Feedforward-Feedback, Generator-Evaluator
- **3 drift detection paradigms**: Tool-call (L2.5), Spec (L3), Implementation (L4)
- **Model-adaptive**: 4 profiles (opus/gpt/gemini/strict) × 4 configuration layers

## Authoritative Pages

| Page | Role |
|------|------|
| [[harness-implementation-plan]] | Master plan: phases, token budget, architecture |
| [[harness]] | Pipeline overview with layer descriptions |
| [[harness-control-frameworks]] | Unified formal models |
| [[drift-detection-unified]] | Three complementary drift paradigms |
| [[index]] | Master catalog of all wiki pages |

## Key Decisions

- [[adr-008]] — Spec-Only Black-Box QA
- [[adr-009]] — claude-obsidian Mode B persistent memory
- [[adr-010]] — Wiki tight-coupling contract (read-first, write-after)
- [[adr-011]] — Consensus debate with selective routing (iMAD)
