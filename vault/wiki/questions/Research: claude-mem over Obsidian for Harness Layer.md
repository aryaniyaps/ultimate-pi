---
type: synthesis
title: "Research: claude-mem over Obsidian for Harness Layer"
created: 2026-05-05
updated: 2026-05-05
tags:
  - research
  - memory
  - harness
  - claude-mem
  - obsidian
status: developing
related:
  - "[[persistent-memory]]"
  - "[[adr-009]]"
  - "[[Research: Claude Code State-of-the-Art Harness Improvements]]"
  - "[[lifecycle-hooks]]"
  - "[[Codex Harness Innovations (OpenAI)]]"
  - "[[memory-system-of-record-vs-ephemeral-cache]]"
sources:
  - "[[adr-009]]"
  - "[[persistent-memory]]"
  - "[[Research: Claude Code State-of-the-Art Harness Improvements]]"
  - "[[claude-code-architecture-karaxai-2026]]"
  - "[[codex-harness-innovations]]"
---

# Research: claude-mem over Obsidian for Harness Layer

## Overview
Current harness memory decision is explicit and stable: Obsidian wiki is Layer 6 system of record via ADR-009. Local corpus has no direct `claude-mem` implementation details, so replacement recommendation cannot be high confidence. Based on current evidence, full replacement is not advised; safest path is Obsidian as source of truth plus optional local auto-memory cache if needed.

## Key Findings
- **System-of-record already chosen (high)**: ADR-009 explicitly replaces vector-memory stack with claude-obsidian Mode B, with `hot.md -> index.md -> pages` retrieval and lower dependency surface (Source: [[adr-009]]).
- **Harness contracts depend on wiki structure (high)**: Layer write/read hooks, auditability, and cross-layer memory mapping are built around `wiki/index.md`, `wiki/log.md`, and `wiki/hot.md` (Source: [[persistent-memory]]).
- **Prompt memory is weaker than deterministic controls (high)**: Claude architecture notes ~92% instruction compliance from CLAUDE.md versus deterministic hook enforcement when configured (Source: [[lifecycle-hooks]], [[claude-code-architecture-karaxai-2026]]).
- **Automatic memory and explicit wiki solve different problems (medium)**: Codex-style implicit memories help fast context recovery, but explicit wiki remains better for durable decisions, provenance, and human review (Source: [[codex-harness-innovations]]).
- **No verified claude-mem data in current wiki (low)**: No local source page or benchmark for claude-mem behavior, storage model, recall quality, or failure modes in this repo context.

## Key Entities
- [[Claude Code]]: demonstrates multi-memory architecture and deterministic hook enforcement.
- [[Codex Harness Innovations (OpenAI)]]: demonstrates automatic/implicit memory pattern.

## Key Concepts
- [[persistent-memory]]: current Layer 6 design.
- [[lifecycle-hooks]]: reliability boundary between prompt-following and enforcement.
- [[memory-system-of-record-vs-ephemeral-cache]]: recommended split architecture.

## Contradictions
- [[adr-009]] optimizes for explicit wiki memory with human-readable provenance; [[codex-harness-innovations]] shows value in implicit auto-memory capture. Best reconciliation: keep explicit wiki as canonical and use implicit memory only as non-authoritative accelerator.

## Recommendation
- Do **not** replace Obsidian with claude-mem as primary harness memory right now.
- If you want claude-mem, run it as a **secondary cache layer** only:
  - read order: claude-mem quick hints -> wiki `hot.md` -> wiki `index.md` -> linked pages
  - write order: all accepted decisions and patterns must land in wiki files
  - enforcement: hooks block "done" unless wiki write completed for decision-bearing tasks

## Open Questions
- What is claude-mem persistence format and durability under compaction/restart?
- Can claude-mem expose provenance links equivalent to wiki page references?
- What are precision/recall metrics on this repo versus wiki query flow?
- How should conflict resolution work when claude-mem memory disagrees with wiki decisions?
- What token/cost/latency delta appears in real harness runs with hybrid mode?

## Sources
- [[adr-009]]: persistent memory ADR, 2026-04-28.
- [[persistent-memory]]: Layer 6 module contract.
- [[Research: Claude Code State-of-the-Art Harness Improvements]]: memory and control architecture synthesis.
- [[claude-code-architecture-karaxai-2026]]: CLAUDE.md memory and compliance behavior.
- [[codex-harness-innovations]]: implicit/automatic memory pattern comparison.
