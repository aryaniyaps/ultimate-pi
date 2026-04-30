---
type: concept
title: "ast-compression"
created: 2026-04-30
updated: 2026-04-30
status: seed
tags: [#concept, #lean-ctx, #context-optimization]
related:
  - "[[lean-ctx]]"
  - "[[ast-truncation]]"
---

# AST Compression

> [!stub] See also: [[ast-truncation]] for the harness-specific implementation.

lean-ctx's approach to code compression: use tree-sitter to parse code in 18 languages, extract only signatures, types, and logic bodies, and strip comments, whitespace, and non-essential syntax. Achieves 60-95% token reduction on source files.

Differs from [[ast-truncation]] (which stubs function bodies) in that AST compression preserves logic but strips non-semantic elements, while AST truncation removes function bodies entirely for high-level structural views.
