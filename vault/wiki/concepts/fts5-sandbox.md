---
type: concept
title: "fts5-sandbox"
created: 2026-04-30
updated: 2026-04-30
status: seed
tags: [#concept, #context-mode, #architecture]
related:
  - "[[context-mode]]"
  - "[[Research: context-mode vs lean-ctx]]"
---

# FTS5 Sandbox

> [!stub] This is a stub page. See [[context-mode]] for full documentation.

context-mode's core architecture: intercept agent tool calls, run them in a sandboxed subprocess, index the output into SQLite FTS5 with BM25 ranking, and let the agent search the indexed output on demand. Raw tool output never enters the agent's context window — the agent queries the sandbox instead.

Achieves up to 99.5% token reduction on large tool outputs (e.g., 56.2KB Playwright output → 299B).
