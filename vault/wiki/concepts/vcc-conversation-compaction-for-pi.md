---
type: concept
status: developing
created: 2026-05-05
tags:
  - pi-agent
  - vcc
  - compaction
  - memory
related:
  - "[[pi-vcc-github-repo]]"
  - "[[context-continuity]]"
  - "[[structured-compaction]]"
---

# VCC Conversation Compaction for Pi

## Definition

VCC in Pi context refers to transcript-preserving, deterministic compaction approach adopted by `pi-vcc`, inspired by View-oriented Conversation Compiler. It compresses sessions without calling an LLM, then adds recall over raw lineage history.

## Core Mechanics

- Algorithmic extraction, not model summarization
- Stable sectioned output: goal, files, commits, outstanding context, preferences
- Explicit recall API (`vcc_recall`) with regex and lineage scope
- High token reduction on long sessions (often 90%+)

## Practical Impact

For long-running coding sessions, VCC-style compaction reduces cost and hallucination risk during summarization while preserving retrievability of older context.

## Competitive Position in Pi Ecosystem

pi-vcc is the only fully deterministic (no-LLM) compaction extension. Three other Pi compaction extensions exist but all use LLM calls:
- **pi-model-aware-compaction**: Per-model threshold triggers (timing control, not algorithm change)
- **pi-custom-compaction**: Swap compaction model/template (still LLM-based)
- **pi-agentic-compaction**: Virtual filesystem + sandboxed tools (still LLM-based)

See [[pi-compaction-extensions-ecosystem]] for full comparison and [[deterministic-session-compaction]] for the broader pattern.

## Broader Pattern Validation

The deterministic compaction pattern is independently validated by:
- **Codex DSC RFC** (openai/codex#8573): Proposed identical approach for Codex, closed as not_planned (Source: [[codex-dsc-rfc-8573]])
- **Distill** (143 stars): Deterministic context preprocessing, different layer but same no-LLM principle (Source: [[distill-deterministic-context-compression]])
- **MemoSift**: 6-layer deterministic compression engine with framework adapters

## Clarification

VCC here is **not** VS Code extension acronym. It is compaction method and Pi package category.
