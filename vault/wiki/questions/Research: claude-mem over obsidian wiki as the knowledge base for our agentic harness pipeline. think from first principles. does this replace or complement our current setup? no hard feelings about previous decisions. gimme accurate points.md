---
type: synthesis
title: "Research: claude-mem over obsidian wiki as the knowledge base for our agentic harness pipeline. think from first principles. does this replace or complement our current setup? no hard feelings about previous decisions. gimme accurate points"
created: 2026-05-05
updated: 2026-05-05
tags:
  - research
  - memory
  - claude-mem
  - obsidian
  - harness
  - first-principles
status: developing
related:
  - "[[adr-009]]"
  - "[[persistent-memory]]"
  - "[[lifecycle-hooks]]"
  - "[[memory-system-of-record-vs-ephemeral-cache]]"
  - "[[Research: how claude-mem fits into our workflow. and whether it should replace obsidian in the codebase. no hard feelings about previous actions, rethink from first principles always]]"
sources:
  - "[[adr-009]]"
  - "[[persistent-memory]]"
  - "[[anthropic-effective-harnesses]]"
  - "[[claude-code-architecture-qubytes-2026]]"
  - "[[codex-open-source-agent-2026]]"
---

# Research: claude-mem over obsidian wiki as the knowledge base for our agentic harness pipeline. think from first principles. does this replace or complement our current setup? no hard feelings about previous decisions. gimme accurate points

## Overview
First-principles answer: `claude-mem` does not replace Obsidian wiki in current harness design. It complements wiki as a fast recall cache. Canonical decision memory, provenance, and enforcement still belong in wiki system-of-record.

## Research Method
- Round 1 (broad): evaluate harness-memory requirements, existing ADRs, and architecture contracts.
- Round 2 (gap fill): validate whether vault contains direct `claude-mem` primary evidence.
- Round 3: skipped; confidence ceiling reached because direct `claude-mem` source evidence is still missing.
- Constraint note: web tool access blocked in this run, so findings rely on existing filed sources.

## First-Principles Criteria
1. Canonical memory must be durable across sessions.
2. Memory claims must be auditable and human-inspectable.
3. Decision provenance must be linkable and conflict-resolvable.
4. Completion gates must enforce write-back deterministically.
5. Fast recall is useful, but cannot override canonical truth.

## Key Findings
- **(high)** Current architecture already sets canonical memory to wiki via `[[adr-009]]`, with read order and durable files (`hot.md`, `index.md`, linked pages). (Source: [[adr-009]], [[persistent-memory]])
- **(high)** Harness integration points and lifecycle write patterns are coupled to wiki artifacts; replacing wiki implies re-architecting memory contracts across layers. (Source: [[persistent-memory]])
- **(high)** Deterministic hooks and gates are required for policy reliability; prompt memory alone drifts under long-running workloads. (Source: [[anthropic-effective-harnesses]], [[claude-code-architecture-qubytes-2026]])
- **(medium)** Auto-memory pattern is useful for convenience and continuity, but strongest in non-authoritative role alongside explicit durable memory. (Source: [[codex-open-source-agent-2026]])
- **(low)** Vault still lacks direct `claude-mem` benchmark evidence (storage semantics, provenance fidelity, recall precision, conflict behavior), so full replacement claim is unproven.

## Replace vs Complement
### Replace
Not supported by current evidence. Fails criteria 2-4 unless additional mechanisms are proven.

### Complement
Supported. Use `claude-mem` as optional acceleration cache; keep wiki as source-of-record.

## Recommended Operating Model
1. Read path: `claude-mem` hints -> `[[hot]]` -> `[[index]]` -> canonical linked pages.
2. Write path: all decision-bearing outputs must land in wiki first.
3. Conflict rule: cache and wiki disagree -> wiki wins.
4. Enforcement: stop-hook blocks completion when required wiki filing is missing.

## Contradictions
- Fast-memory systems optimize latency; wiki optimizes auditability and governance. One layer cannot optimize both without tradeoffs. Use two-layer memory model.

## Open Questions
- What are exact retention and deletion semantics for `claude-mem` in team workflows?
- Can `claude-mem` produce source-level provenance links compatible with wikilinks?
- What measured latency/token gain appears in this repo with cache+wiki mode?
- What precision/recall benchmark should define acceptable cache quality?

## Sources
- [[adr-009]]: canonical memory ADR.
- [[persistent-memory]]: layer contract and write/read patterns.
- [[anthropic-effective-harnesses]]: long-running harness constraints.
- [[claude-code-architecture-qubytes-2026]]: practical persistence/hook architecture notes.
- [[codex-open-source-agent-2026]]: implicit memory as complementary pattern.
