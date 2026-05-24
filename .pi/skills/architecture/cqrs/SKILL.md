---
name: cqrs
description: "Use when implementing CQRS: separate command and query models, explicit write invariants, optimized read projections, consistency boundaries, projection rebuilds, and tests for command/query behavior."
---

# CQRS

Use this skill when reads and writes need different models, scaling, permissions, or performance profiles.

## Fit

Use for complex domains with strong write invariants and read-heavy/query-specific views.
Avoid when simple CRUD is adequate; CQRS can double code paths and consistency work.

## Agent Workflow

1. Read `graphify-out/GRAPH_REPORT.md`.
2. Run `graphify query "CQRS command query responsibility segregation projections events"`.
3. Identify commands that change state and queries that read views.
4. Separate write model from read model incrementally.
5. Define consistency and projection rebuild rules.
6. Add tests for commands, projections, and stale reads.

## Target Shape

```text
codebase/<bounded-context>/
  commands/
    handlers/
    model/
  queries/
    handlers/
    projections/
  events/              # optional but common
```

## Implementation Rules

- Commands express intent and enforce invariants through the write model.
- Queries never mutate state.
- Read models are optimized for consumers and may be denormalized.
- Projection lag and stale-read behavior must be explicit.
- Do not expose write entities directly as read DTOs.
- Keep command and query contracts versioned if external.

## Migration Steps

1. Pick one painful read or one complex command.
2. Create command handler and query handler folders.
3. Move invariant logic into command handler/write model.
4. Create a read projection or query representation.
5. Wire projection update from transaction, event, or scheduled rebuild.
6. Add tests for stale/missing projection behavior.

## Verification

- Use graphify to confirm query handlers do not call command mutation paths.
- Test command invariants independently from query projection shape.
- Test projection rebuild from durable source.

## Output Contract

Return: command/query split, consistency model, projection path, migration patch, and verification evidence.
