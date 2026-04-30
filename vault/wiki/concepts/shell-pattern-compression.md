---
type: concept
title: "shell-pattern-compression"
created: 2026-04-30
updated: 2026-04-30
status: seed
tags: [#concept, #lean-ctx, #context-optimization]
related:
  - "[[lean-ctx]]"
  - "[[Research: context-mode vs lean-ctx]]"
---

# shell-pattern-compression

> [!stub] This is a stub page. See [[lean-ctx]] and [[leanctx-website]] for details.

A lean-ctx feature that recognizes 90+ command patterns (git, npm, cargo, docker, kubectl, etc.) and intelligently compresses their output. Instead of passing raw terminal output to the LLM, lean-ctx strips irrelevant lines, summarizes, and formats output for maximum information density per token.

Part of lean-ctx's broader context compression strategy alongside AST-based code compression.

## Key pages

- [[lean-ctx]] — Context Runtime for AI Agents
- [[leanctx-website]] — source documentation
