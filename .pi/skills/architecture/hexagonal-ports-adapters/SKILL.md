---
name: hexagonal-ports-adapters
description: "Use when implementing hexagonal architecture / ports and adapters: domain core isolated from delivery and infrastructure mechanisms, inbound and outbound ports, adapters for external interfaces, dependency inversion, and testable business logic."
---

# Hexagonal Architecture / Ports and Adapters

Use this skill to make business logic independent of delivery mechanisms and infrastructure.

## Fit

Use when domain logic is valuable, tests are brittle due to delivery/infrastructure coupling, or adapters change often.
Avoid if the system is a tiny CRUD wrapper where abstraction would be ceremony.

## Agent Workflow

1. Read `graphify-out/GRAPH_REPORT.md`.
2. Run `graphify query "hexagonal architecture ports adapters domain operational coupling"`.
3. Identify the core domain/application use case.
4. Define inbound and outbound ports around it.
5. Move delivery/infrastructure-specific code to adapters.
6. Test the core through ports without infrastructure.

## Target Shape

```text
codebase/
  core/
    domain/
    application/
    ports/
      inbound-port
      outbound-port
  adapters/
    inbound/external-interface/
    inbound/operator-interface/
    outbound/persistence/
    outbound/messaging/
```

## Implementation Rules

- Core owns domain and application behavior.
- Inbound adapters translate external requests into use-case calls.
- Outbound adapters implement core-defined ports for persistence, messaging, time, IDs, and external APIs.
- Dependencies point inward: adapters reference core, core does not reference adapters.
- Use dependency injection/composition at the edge.

## Migration Steps

1. Pick one use case entangled with delivery or persistence infrastructure.
2. Extract its input/output contracts and port interfaces into core.
3. Move business decisions into application/domain.
4. Wrap existing persistence/integration code as an outbound adapter.
5. Wire adapters in the composition root.
6. Add core tests with fake outbound ports.

## Verification

- `graphify explain "core"` should show no outbound adapter or infrastructure references.
- Search core paths for delivery, persistence, messaging, filesystem, environment, or platform dependencies.
- Test core without starting external infrastructure.

## Output Contract

Return: core boundary, ports, adapters, composition root change, tests, and remaining coupling.
