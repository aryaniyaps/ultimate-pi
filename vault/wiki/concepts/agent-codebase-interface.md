---
type: concept
title: "Agent-Codebase Interface (ACI)"
created: 2026-04-30
updated: 2026-04-30
tags:
  - agent-architecture
  - codebase-exploration
  - interface-design
related:
  - "[[swe-agent-aci]]"
  - "[[agent-first-exploration]]"
status: developing
---

# Agent-Codebase Interface (ACI)

The design of tool interfaces specifically for AI agents — not humans — to interact with codebases. Extends the SWE-agent concept of Agent-Computer Interfaces to codebase exploration specifically.

## Core Principle

Agents process information differently from humans. They have:
- **Fixed context windows** (not infinite working memory)
- **Token-based costs** (every byte of context has a cost)
- **No visual cortex** (can't "see" code structure, need explicit representations)
- **No intuition** (can't form mental models from partial exposure)
- **Perfect recall within context** (but zero recall outside it)

Therefore, the interface must:
1. Maximize information density per token
2. Present structured, machine-parseable representations
3. Support progressive disclosure (drill down on demand)
4. Enable autonomous navigation decisions

## Contrast with Human Interfaces

| Human Interface | Agent Interface |
|----------------|-----------------|
| Syntax highlighting, file trees | AST symbol maps, dependency graphs |
| Scroll through files | Fetch specific symbol definitions |
| Visual pattern recognition | Semantic search + structured queries |
| Gradual immersion ("Paper Cuts") | Bulk ingestion + ranking algorithms |
| IDE debugging (step-through) | Execution feedback loops (run tests, check output) |
| "Use the project" to learn | "Map the project" to learn |
