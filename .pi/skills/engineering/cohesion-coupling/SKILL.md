---
name: cohesion-coupling
description: Improve code-level modularity by increasing cohesion and reducing accidental coupling. Use when splitting files/components, moving logic, introducing boundaries, or reviewing dependency direction. Focuses on reason-to-change, dependency minimization, and cognitive load.
---

# Cohesion and Coupling

Use this skill to make code easier to understand and change.

## Cohesion checks

Keep together code that:

- changes for the same reason
- enforces the same invariant
- uses the same domain language
- participates in the same workflow step
- shares a stable lifecycle

## Coupling checks

Reduce dependencies that are:

- unnecessary for the caller's purpose
- pointed from stable code to volatile code
- created only for convenience
- transitive through broad utility modules
- hidden through globals or ambient context

## Workflow

1. Identify the responsibility being changed.
2. List current dependencies and call direction.
3. Move behavior toward the concept that owns the rule.
4. Expose a narrow facade instead of leaking internals.
5. Remove dependency cycles or document why they cannot be removed now.
6. Verify call sites still read clearly.

## Avoid

- Splitting code by technical layer when the change is domain-local.
- Central helper modules that collect unrelated behavior.
- Abstractions that reduce lines but increase conceptual coupling.
