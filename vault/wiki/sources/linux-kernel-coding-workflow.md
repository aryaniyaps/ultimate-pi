---
type: source
source_type: official-documentation
title: "Linux Kernel Coding Style and Development Workflow"
author: "Linus Torvalds, Jonathan Corbet et al."
date_published: 2026-01-20
url: "https://github.com/torvalds/linux/blob/master/Documentation/process/coding-style.rst"
confidence: high
key_claims:
  - "Functions should be short and do one thing well"
  - "8-character tabs enforce shallow nesting; >3 levels is a design problem"
  - "K&R brace style, functions get opening brace on next line"
  - "Centralized error handling via goto for cleanup paths"
  - "Reference counting mandatory for data structures visible to multiple threads"
  - "Don't crash the kernel — WARN_ON_ONCE preferred over BUG()"
  - "Time-based release cycle: 2-week merge window, 6-10 week rc stabilization"
  - "Chain-of-trust maintainer hierarchy: patches flow up through subsystem trees"
tags: [linux, coding-style, kernel, torvalds]
---

# Linux Kernel Coding Style and Development Workflow

## Coding Style — Direct from Linus

The Linux kernel coding style document enforces strict, opinionated rules:

- **8-character tabs**: not just aesthetic — forces refactoring when nesting exceeds 3 levels
- **K&R braces**: opening brace on same line for statements, on next line for functions. "K&R are right."
- **Short functions**: should fit on 1-2 screenfuls (80x24). Local variables ≤ 5-10.
- **Descriptive globals, short locals**: `count_active_users()`, not `cntusr()`; loop counter is `i`, not `loop_counter`
- **No typedefs** for structs/pointers: `struct virtual_container *a` beats `vps_t a`
- **Centralized exit via goto**: for cleanup in functions with multiple exit points. Label names describe what they free.
- **Comments say WHAT, not HOW**: if function needs inline comments explaining how it works, rewrite it.
- **Reference counting**: mandatory for any data structure accessible from another thread. "If another thread can find your data structure and you don't have a reference count, you almost certainly have a bug."
- **Don't crash the kernel**: use `WARN_ON_ONCE()`, not `BUG()`. Kernel crashes are user decisions.

## Development Process

- **Time-based releases**: new major kernel every 2-3 months
- **2-week merge window**: all new features land here. ~1,000 patches/day.
- **6-10 week stabilization**: only fixes after -rc1. Regressions are the primary metric.
- **Chain of trust**: patches flow through subsystem maintainers → Linus. Only ~1.3% of patches chosen directly by Linus.
- **linux-next**: integration tree where all pending patches are tested before merge window.
- **Staging trees**: drivers/staging/ for code not yet meeting quality standards; includes TODO files.

## Linus on AI-Generated Code (2026)

- Vibe coding: "fairly positive" for learning, "horrible, horrible idea from a maintenance standpoint" for production.
- Linux kernel policy: AI-generated code is acceptable if reviewed by a human who takes responsibility. "If the code is good, it's good. If it's hallucinatory AI slop that breaks the kernel, the human who clicked submit is responsible."
- "Code is cheap. Show me the talk." — prioritizes demonstrated understanding over volume of output.
