---
name: legacy-code-seams
description: Safely change hard-to-test legacy code. Use when code has hidden side effects, weak tests, global state, large routines, unclear ownership, or risky dependencies. Focuses on seams, characterization tests, dependency isolation, and avoiding clean rewrites.
---

# Legacy Code Seams

Use this skill to modify legacy code without destabilizing unknown behavior.

## Principles

- Preserve current behavior until a deliberate behavior change is requested.
- Add tests around observed behavior before restructuring.
- Introduce seams at dependency boundaries rather than rewriting internals first.
- Prefer wrapping, extracting, and adapting over large replacement.

## Workflow

1. Identify the change point and affected behavior.
2. Find seams: parameters, interfaces, facades, adapters, configuration, entrypoints, or file/module boundaries.
3. Add characterization tests for the behavior you will touch.
4. Isolate hard dependencies such as time, randomness, storage, network, process state, or environment.
5. Make the requested change through the seam.
6. Keep legacy compatibility until callers and tests prove it can be removed.

## Avoid

- Large rewrites justified only by code quality.
- Changing multiple responsibilities while fixing one bug.
- Deleting strange behavior without proving it is unused.
- Assuming undocumented behavior is accidental.

## Verification

Use regression tests, golden examples, focused integration checks, and diff review to prove intended behavior changed and adjacent behavior stayed stable.
