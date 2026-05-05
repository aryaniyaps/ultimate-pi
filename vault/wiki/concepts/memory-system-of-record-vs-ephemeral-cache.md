---
type: concept
title: "Memory System-of-Record vs Ephemeral Cache"
aliases: ["memory layering", "canonical memory vs fast memory"]
created: 2026-05-05
updated: 2026-05-05
tags: [concept, memory, harness, architecture]
status: developing
related:
  - "[[persistent-memory]]"
  - "[[adr-009]]"
  - "[[lifecycle-hooks]]"
  - "[[Research: claude-mem over Obsidian for Harness Layer]]"
sources:
  - "[[adr-009]]"
  - "[[persistent-memory]]"
  - "[[codex-harness-innovations]]"
---

# Memory System-of-Record vs Ephemeral Cache

## Definition
Split agent memory into two layers:
- **System-of-record memory**: durable, auditable, human-reviewable, citation-ready.
- **Ephemeral cache memory**: fast, local, convenience-oriented, non-authoritative.

## Why This Pattern
- Harness decisions need traceability and contradiction handling.
- Fast memory helps turn-level latency and continuity.
- Mixing both into one store causes drift: quick notes get mistaken as validated decisions.

## Harness Mapping
| Layer | Role | Example in this repo |
|---|---|---|
| System-of-record | Canonical truth | `vault/wiki/` with `index.md`, `log.md`, `hot.md` |
| Ephemeral cache | Speed and recall hints | Optional local auto-memory tool |

## Guardrails
- Any decision, architecture change, or policy update must be written to wiki.
- Ephemeral memory can suggest; wiki must confirm.
- When cache conflicts with wiki, wiki wins.
- Completion hooks should fail tasks that changed architecture without wiki write.

## Tradeoff
- Pure wiki: higher reliability, more manual writing.
- Pure auto-memory: lower friction, weaker audit/provenance.
- Hybrid: best practical balance for agentic harnesses.
