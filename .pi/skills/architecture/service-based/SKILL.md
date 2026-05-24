---
name: service-based
description: "Use when implementing service-based architecture: coarse-grained domain services inside a mostly centralized system, with explicit service contracts, transaction boundaries, shared infrastructure discipline, and fewer operational costs than microservices."
---

# Service-Based Architecture

Use this skill to carve coarse domain services without forcing full microservice overhead.

## Fit

Use when modules need clearer runtime/service boundaries but can share deployment, database infrastructure, or platform operations.
Avoid when independent deployability and data ownership per service are already mandatory.

## Agent Workflow

1. Read `graphify-out/GRAPH_REPORT.md`.
2. Run `graphify query "service-based architecture coarse services database boundaries transactions"`.
3. Identify coarse business services and shared resources.
4. Define service contracts and transaction ownership.
5. Extract one service facade and move callers behind it.
6. Add contract and dependency checks.

## Target Shape

```text
codebase/services/
  customer/
    contract
    service
    data-access
  order/
    contract
    service
    data-access
codebase/platform/     # shared runtime, config, logging, persistence connection
```

## Implementation Rules

- Services are coarse-grained and domain-aligned, not one service per entity.
- Services expose contracts; callers do not reach into service internals.
- Transaction boundaries are explicit and usually owned by the called service.
- Shared DB is allowed, but table ownership and cross-service writes must be documented.
- Avoid distributed systems ceremony unless deployment separation is real.

## Migration Steps

1. Pick one domain service with many scattered callers.
2. Create the service contract and service facade.
3. Move behavior behind the facade.
4. Replace direct data writes from other areas with service calls.
5. Document data ownership.
6. Add tests for service contract and transaction behavior.

## Verification

- Use `graphify explain "<service name>"` to inspect inbound/outbound coupling.
- Search for cross-service imports into internal files.
- Test that callers use contracts and cannot mutate owned data directly.

## Output Contract

Return: service boundaries, contracts, transaction rules, migrated callers, verification, and microservice-readiness caveats.
