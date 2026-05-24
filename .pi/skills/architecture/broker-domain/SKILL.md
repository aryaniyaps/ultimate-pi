---
name: broker-domain
description: "Use when implementing the Broker-Domain pattern: event-brokered integration around cohesive domain services, separating broker concerns from domain behavior, with explicit event contracts and bounded context ownership."
---

# Broker-Domain Pattern

Use this skill when event-driven integration is needed but domain logic must stay inside cohesive domain boundaries.

## Fit

Use when multiple domains coordinate through events and you need to avoid both a god orchestrator and an anemic event-bus blob.
Avoid when a simple in-process call or single workflow orchestrator is clearer.

## Agent Workflow

1. Read `graphify-out/GRAPH_REPORT.md`.
2. Run `graphify query "Broker-Domain pattern event broker domain services bounded contexts"`.
3. Identify domain services and event broker responsibilities separately.
4. Keep event routing/transport out of domain decisions.
5. Implement one domain event flow end to end.
6. Add contract, idempotency, and ownership checks.

## Target Shape

```text
codebase/domains/
  orders/
    domain/
    application/
    events            # domain-owned event contracts
  billing/
    ...
codebase/broker/
  bus
  subscriptions
  serializers
```

## Implementation Rules

- Domains publish and consume meaningful business events.
- Broker code owns transport, serialization, subscription wiring, retries, and delivery mechanics.
- Domain code must not depend on broker vendor APIs.
- Event contracts belong to the producing domain and are versioned.
- Consumers translate external events into local application actions.

## Migration Steps

1. Select one cross-domain interaction.
2. Define producer-owned event contract.
3. Add broker adapter that maps domain event to transport message.
4. Add consumer subscription that calls local application service.
5. Add idempotency and dead-letter handling.
6. Remove direct cross-domain call if the event path replaces it safely.

## Verification

- `graphify explain "broker"` should show broker-to-domain adapter edges, not domain-to-vendor lock-in.
- Test event contract compatibility and duplicate delivery.
- Check no domain imports broker implementation packages.

## Output Contract

Return: domains, broker responsibilities, event contracts, migrated interaction, failure handling, and verification.
