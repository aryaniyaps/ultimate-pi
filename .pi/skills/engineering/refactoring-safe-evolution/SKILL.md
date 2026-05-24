---
name: refactoring-safe-evolution
description: Refactor code without changing observable behavior. Use when improving structure, extracting abstractions, simplifying code, or modernizing internals while preserving existing contracts. Guides characterization, small mechanical steps, reversible edits, and verification after each phase.
---

# Refactoring for Safe Evolution

Use this skill when the goal is better structure, not new behavior.

## Preconditions

- Identify the observable behavior that must remain unchanged.
- Identify public contracts, persistence formats, events, commands, and integration points.
- If behavior is unclear, add characterization tests before changing structure.

## Workflow

1. State the refactoring goal and explicit non-behavioral scope.
2. Capture current behavior with existing tests, characterization tests, or executable examples.
3. Make one mechanical transformation at a time: extract, rename, move, inline, split, or isolate.
4. Keep old and new paths equivalent during transitions when possible.
5. Run targeted checks after each meaningful step.
6. Remove temporary compatibility code only after callers are migrated and verified.

## Safe transformations

- Extract pure logic from side-effecting code.
- Move code behind an existing interface/facade.
- Rename with all call sites updated atomically.
- Split large routines by responsibility.
- Replace duplicated logic with a single well-named concept.

## Stop conditions

Stop and ask or report risk if the refactor requires contract changes, data migration, broad formatting, new dependencies, or behavior you cannot characterize.
