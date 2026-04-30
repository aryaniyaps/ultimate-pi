---
type: concept
title: "context-mode"
created: 2026-04-30
updated: 2026-04-30
status: seed
tags: [#concept, #tool, #context-optimization]
sources:
  - "[[context-mode-website]]"
related:
  - "[[Research: context-mode vs lean-ctx]]"
  - "[[think-in-code]]"
  - "[[agentic-harness-context-enforcement]]"
---

# context-mode

> [!stub] This is a stub page. See [[context-mode-website]] for source documentation.

context-mode is an MCP-based context optimization tool by B. Mert Köseoğlu (11K+ GitHub stars). It intercepts tool output and sandboxes it into SQLite FTS5 with BM25 ranking, preventing raw tool output from entering the agent's context window.

## Architecture

Uses **intercept-and-sandbox**: raw tool output never enters context. Instead, output is indexed into FTS5 and the agent queries on demand. This achieves up to 99.5% token reduction.

## Key features

- FTS5 sandbox with BM25 ranking
- "Think in Code" paradigm enforcement
- 26-event session continuity
- ELv2 license, TypeScript/Node.js

## Key pages

- [[context-mode-website]] — source documentation
- [[Research: context-mode vs lean-ctx]] — comparison with lean-ctx
- [[think-in-code]] — the "Think in Code" paradigm
- [[fts5-sandbox]] — architecture detail
