---
name: microservices
description: "Use when designing, extracting, or repairing microservices: independently deployable bounded-context services with owned data, explicit contracts, observability, resilience, distributed workflow choices, and operational readiness checks."
---

# Microservices Architecture

Use this skill only when service independence is worth distributed-system cost.

## Fit

Use when services need independent deployability, independent scaling, domain autonomy, and separate data ownership.
Avoid when boundaries are unclear, teams cannot operate services, or a modular monolith would solve the problem.

## Agent Workflow

1. Read `graphify-out/GRAPH_REPORT.md`.
2. Run `graphify query "microservices bounded context data isolation choreography orchestration sagas"`.
3. Identify bounded contexts and fracture planes.
4. Choose one extraction candidate with high cohesion and low coupling.
5. Define API/events/data ownership before moving code.
6. Add production-readiness controls with the first extraction.

## Target Shape

```text
services/
  orders/
    code/
    contract/          # API specs, event schemas
    migrations/
    deploy/
  billing/
    ...
shared/                # generated clients/contracts only; no shared domain model
```

## Implementation Rules

- Each service owns its data; no cross-service table writes.
- Contracts are explicit: API schema, event schema, or generated client.
- Distributed workflows use choreography, orchestration, or saga intentionally.
- Every network call has timeout, retry policy, circuit breaker/backoff as appropriate, and observability.
- Avoid shared domain libraries; share contracts, not internals.
- Extraction must include deployment, rollback, monitoring, and incident path.

## Migration Steps

1. Prove the boundary with a modular monolith facade first when possible.
2. Create service contract and data ownership doc.
3. Duplicate or migrate data behind an anti-corruption layer.
4. Route one use case through the new service.
5. Add contract tests and consumer-driven compatibility checks.
6. Add traces, metrics, logs, health checks, and rollback.

## Verification

- `graphify explain "<service>"` should show contract edges, not private code sharing.
- Test API compatibility, idempotency, failure, timeout, and degraded dependency behavior.
- Verify no direct database access across service boundaries.

## Output Contract

Return: service boundary, contracts, data ownership, extraction patch, resilience controls, verification, and ops risks.
