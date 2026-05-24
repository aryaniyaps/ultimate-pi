---
name: complexity-control
description: Reduce accidental complexity while preserving essential behavior. Use when code becomes hard to reason about, branches multiply, abstractions feel premature, or a simple feature is spreading across many files. Focuses on explicitness, concept deduplication, and avoiding clever generic designs.
---

# Complexity Control

Use this skill to make the simplest correct change.

## Distinguish complexity types

- Essential complexity: required by the domain, correctness, scale, security, or compatibility.
- Accidental complexity: introduced by unclear structure, duplication, premature abstraction, hidden state, or over-generalization.

## Workflow

1. State the problem in one sentence.
2. Identify the minimum concepts needed to solve it.
3. Remove duplicate representations of the same concept.
4. Prefer straightforward control flow over clever indirection.
5. Add abstraction only after it clarifies repeated behavior or protects a real boundary.
6. Document unavoidable complexity near the code that needs it.
7. Verify that the final code has fewer paths a maintainer must simulate mentally.

## Warning signs

- Generic names with no domain meaning.
- Configuration that controls unrelated behaviors.
- Multiple sources of truth.
- Deep nesting or long chains of callbacks/handlers/coordinators.
- Abstraction introduced for a single use without a clear boundary.
