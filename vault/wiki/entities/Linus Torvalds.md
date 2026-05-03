---
type: entity
entity_type: person
title: "Linus Torvalds"
role: "Creator of Linux kernel and Git"
active: true
tags: [person, linux, kernel, open-source]
related:
  - "[[linux-kernel-coding-workflow]]"
  - "[[chain-of-trust-software]]"
  - "[[fast-feedback-loops]]"
---

# Linus Torvalds

Creator of the Linux kernel (1991) and Git version control system (2005). Maintains the kernel through a hierarchical chain-of-trust model: subsystem maintainers review and merge patches, then Torvalds pulls from them during 2-week merge windows.

## Key Engineering Practices

- **Opinionated coding standards**: 8-char tabs, short functions, K&R braces. Enforced by style guide, not tooling alone.
- **Don't break userspace**: backward compatibility is sacred. Regressions are the primary metric for release readiness.
- **"Good taste" in code**: eliminating edge cases at the design level rather than handling them.
- **Anti-hype on AI**: vibe coding is "horrible for production" but "fairly positive" for learning (2026). AI-generated code must carry human accountability.
- **"Code is cheap. Show me the talk."** — values demonstrated understanding over volume of output.

## Relevance to AI Coding Harness

Torvalds' kernel workflow maps to harness quality gates: every AI-generated change must be reviewable, diffable, and attributable to a human gatekeeper. The chain-of-trust model suggests a tiered verification pipeline where simpler checks run before human review. The "don't break userspace" principle maps to behavioral regression testing as a mandatory harness layer.
