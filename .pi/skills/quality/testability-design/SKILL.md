---
name: testability-design
description: Reshape code so important behavior can be tested simply. Use when code is hard to test due to IO, time, randomness, globals, hidden dependencies, side effects, or platform/runtime coupling. Separates pure logic from effects and introduces stable seams.
---

# Testability Design

Use this skill when verification is difficult because the design hides seams.

## Workflow

1. Identify behavior worth testing separately from the mechanism that triggers it.
2. Move pure decisions/calculations away from IO and mutation where practical.
3. Inject or pass volatile dependencies such as clocks, randomness, environment, storage, network, and external processes.
4. Replace ambient/global state with explicit inputs or narrow adapters where safe.
5. Expose behavior through a stable public seam rather than private internals.
6. Keep tests close to the level of the behavior being guaranteed.

## Good seams

- boundary adapters
- domain services or policies
- command/query handlers
- parser/serializer boundaries
- workflow step interfaces
- configuration providers
- repository/storage ports

## Avoid

- Making private implementation public only for tests.
- Adding test-only branches to production logic.
- Over-abstracting every dependency before a real testability problem exists.
