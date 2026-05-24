---
name: modular-monolith
description: "Use when designing, splitting, or repairing a modular monolith: one deployable application with explicit business modules, bounded contexts, private internals, stable module APIs, and database boundaries that can later support service extraction."
---

# Modular Monolith

Use this skill when an agent should preserve monolith simplicity while creating real architectural boundaries.

## Fit

Use when one deployable is acceptable but the codebase needs independent business modules, lower coupling, and clearer ownership.
Avoid premature microservices when deployment independence, team autonomy, and operational maturity are not proven.

## Agent Workflow

1. Read `graphify-out/GRAPH_REPORT.md`.
2. Run `graphify query "modular monolith bounded context module boundaries coupling"`.
3. Identify business capabilities and their current code communities.
4. Pick one module boundary to harden.
5. Introduce module APIs before moving persistence or transport code.
6. Verify no private internals leak across modules.

## Target Shape

```text
codebase/modules/
  billing/
    public-api         # exported commands/events/types only
    application/
    domain/
    infrastructure/
    internal/          # never imported by other modules
  identity/
    public-api
    ...
codebase/shared-kernel/ # tiny, stable cross-module primitives only
```

## Implementation Rules

- Modules communicate through an explicit public API/facade, application commands, domain events, or explicit query APIs.
- No module imports another module's `internal/`, `domain/`, or infrastructure files.
- Keep one process and one deployment until extraction pressure is real.
- Prefer per-module schemas/tables or clear ownership comments for shared DBs.
- Shared kernel must be small; duplicated domain language is often better than false sharing.

## Migration Steps

1. Name the bounded context using domain vocabulary.
2. Create the module directory and public API/facade.
3. Move one cohesive use case behind the facade.
4. Replace external imports with facade calls.
5. Add a dependency-boundary rule.
6. Document the module's owned data and events.

## Verification

- `graphify explain "<module name>"` should show few cross-module private edges.
- Use structural search for imports from `modules/*/internal`, `domain`, or `infrastructure` across module boundaries.
- Add tests at module API boundaries, not only end-to-end tests.

## Output Contract

Return: proposed modules, public APIs, forbidden imports, migration patch, fitness check, and extraction readiness notes.
