---
type: synthesis
title: "Research: how claude-mem fits into our workflow. and whether it should replace obsidian in the codebase. no hard feelings about previous actions, rethink from first principles always"
created: 2026-05-05
updated: 2026-05-05
tags:
  - research
  - memory
  - claude-mem
  - obsidian
  - first-principles
status: developing
related:
  - "[[adr-009]]"
  - "[[persistent-memory]]"
  - "[[memory-system-of-record-vs-ephemeral-cache]]"
  - "[[lifecycle-hooks]]"
  - "[[Codex Harness Innovations (OpenAI)]]"
  - "[[Research: claude-mem over Obsidian for Harness Layer]]"
sources:
  - "[[adr-009]]"
  - "[[persistent-memory]]"
  - "[[lifecycle-hooks]]"
  - "[[codex-harness-innovations]]"
  - "[[Research: claude-mem over Obsidian for Harness Layer]]"
---

# Research: how claude-mem fits into our workflow. and whether it should replace obsidian in the codebase. no hard feelings about previous actions, rethink from first principles always

## Overview
First-principles test: memory system for harness must optimize for durability, auditability, deterministic enforcement, and operator trust. Current repo already anchors these in Obsidian wiki structure and ADR-backed contracts. Result: claude-mem fits as accelerator cache, not full replacement for canonical wiki memory.

## Research Method
- Round 1 (broad): scan existing memory architecture pages, ADRs, and harness control pages in local wiki corpus.
- Round 2 (gap-fill): check for direct claude-mem source pages, benchmark pages, and operational evidence in current vault.
- Round 3: skipped; no new primary sources available in current corpus.
- Constraint note: external web fetch was blocked in this run, so all conclusions are bounded to in-vault evidence.

## First-Principles Requirements
1. **Canonical truth must be inspectable by humans and agents**.
2. **Decision provenance must be stable and linkable**.
3. **Memory policy compliance must not depend only on model obedience**.
4. **Fast recall layer can be lossy, canonical layer cannot be lossy**.

## Key Findings
- **(high)** Canonical memory contract already exists and is explicit: `hot.md -> index.md -> linked pages`, with append-only operations log and ADR references (Source: [[adr-009]], [[persistent-memory]]).
- **(high)** Harness write/read points are structurally integrated with wiki pages and event hooks (`session_start`, `session_shutdown`, decision capture), so replacement would require re-architecting multiple layers (Source: [[persistent-memory]]).
- **(high)** Deterministic hooks outperform prompt-only policy memory. Memory hints in prompts can drift; hook gates provide hard enforcement (Source: [[lifecycle-hooks]]).
- **(medium)** Automatic memory capture patterns are useful for continuity and speed, but they complement explicit knowledge systems instead of replacing them when audit/provenance matters (Source: [[codex-harness-innovations]]).
- **(low)** No direct claude-mem benchmark, schema, or failure-mode source is currently filed in this vault, so "replace Obsidian now" cannot be justified with high confidence (Source: [[Research: claude-mem over Obsidian for Harness Layer]]).

## Decision
Do **not** replace Obsidian as memory system-of-record in this codebase now.

## Where claude-mem Fits
- Use claude-mem as **ephemeral recall cache** for short-horizon continuity.
- Keep wiki as **canonical memory ledger** for decisions, ADR alignment, and contradiction handling.
- Enforce write-back: if task changes architecture/policy, completion requires wiki update.

## Recommended Operating Model
1. Read order: quick cache (claude-mem) -> `[[hot]]` -> `[[index]]` -> linked canonical pages.
2. Write order: decision-bearing output -> wiki first; cache may mirror but never override.
3. Conflict rule: cache vs wiki disagreement -> wiki wins.
4. Gate rule: stop-hook blocks completion if required wiki filing is missing.

## Contradictions
- Auto-memory value is real for speed, but speed-optimized memory and audit-optimized memory have different objective functions. Treating them as one layer causes drift.

## Open Questions
- Which claude-mem storage semantics (scope, retention, deletion) are acceptable for this repo?
- Can claude-mem emit citation/provenance pointers equivalent to wiki wikilinks?
- What latency/token savings appear in real runs with hybrid cache + wiki write-back?
- What is the merge/conflict policy when cache proposes stale memory against newer ADRs?

## Sources
- [[adr-009]]: canonical decision for Layer 6 memory.
- [[persistent-memory]]: operational read/write contract.
- [[lifecycle-hooks]]: deterministic enforcement model.
- [[codex-harness-innovations]]: implicit memory complement pattern.
- [[Research: claude-mem over Obsidian for Harness Layer]]: prior internal synthesis and identified gaps.
