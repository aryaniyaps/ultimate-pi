---
name: layered
description: "Use when designing, refactoring, or validating a codebase as layered architecture: delivery/interface, application/use-case, domain, and infrastructure/data layers with one-way dependency rules and minimal cross-layer coupling."
---

# Layered Architecture

Use this skill to help an agent implement layered architecture, not just describe it.

## Fit

Use when the system is mostly CRUD, workflow-oriented, or policy-heavy and benefits from clear dependency direction.
Avoid when independent deployment, high autonomous scaling, or highly asynchronous collaboration is the main driver.

## Agent Workflow

1. Read `graphify-out/GRAPH_REPORT.md` before source files.
2. Run `graphify query "layered architecture dependencies presentation application domain infrastructure"`.
3. Infer the actual layers from packages, modules, and graph communities.
4. Define allowed dependencies before moving code.
5. Make the smallest refactor that improves directionality.
6. Add a fitness check that prevents backsliding.

## Target Shape

Typical dependency direction:

```text
presentation/api -> application/use-cases -> domain -> infrastructure interfaces
                                      infrastructure adapters -> domain/application ports
```

Prefer these directories when introducing structure:

```text
codebase/
  delivery/           # external-interface adapters
  application/        # use cases, commands, queries, units of work
  domain/             # entities, value objects, policies, domain services
  infrastructure/     # persistence, network, messaging, filesystem, platform adapters
```

## Implementation Rules

- Domain code must not reference delivery mechanisms, persistence tooling, messaging systems, clocks, environment, or global configuration.
- Application code orchestrates use cases and owns transaction boundaries.
- Delivery/interface code maps external contracts to application inputs; it does not hold business rules.
- Infrastructure implements interfaces/ports declared inward.
- Shared utilities must be boring, stable, and dependency-free; do not create a junk drawer.

## Migration Steps

1. Pick one vertical use case.
2. Move business decisions from entrypoint handlers into `domain/`.
3. Create an application use-case routine around it.
4. Place infrastructure behind explicit interfaces.
5. Leave old entrypoints as thin adapters.
6. Repeat by use case, not by sweeping folders.

## Verification

- Use `graphify explain "<domain symbol>"` to confirm it has no outbound delivery/infrastructure edges.
- Search domain paths for forbidden references to delivery, persistence, messaging, environment, or platform mechanisms.
- Add dependency-boundary tests with the repo's existing verification tooling.

## Output Contract

Return: inferred layers, violations, minimal migration patch, verification run, and remaining risks.
