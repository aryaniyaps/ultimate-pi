---
name: event-driven
description: "Use when implementing event-driven architecture: domain/integration events, producers, consumers, broker or mediator topology, eventual consistency, idempotency, ordering, retries, and observable asynchronous flows."
---

# Event-Driven Architecture

Use this skill when agents need to decouple producers and consumers with events safely.

## Fit

Use for asynchronous workflows, multi-consumer reactions, integration boundaries, audit trails, and high-throughput decoupling.
Avoid when immediate consistency and simple request/response are enough.

## Agent Workflow

1. Read `graphify-out/GRAPH_REPORT.md`.
2. Run `graphify query "event-driven architecture broker mediator topology eventual consistency"`.
3. Identify facts worth publishing, not commands disguised as events.
4. Choose broker/choreography or mediator/orchestration intentionally.
5. Implement one event path end to end.
6. Add idempotency, retry, and observability before expanding.

## Target Shape

```text
codebase/events/
  contracts/          # event schemas and versions
  event-bus           # publish/subscribe port
  handlers/           # consumers
  outbox/             # reliable publish if DB-backed
```

## Implementation Rules

- Events are past-tense facts: `OrderPlaced`, not `PlaceOrder`.
- Event schemas are versioned and backward-compatible.
- Consumers are idempotent and handle duplicate/out-of-order delivery.
- Use an outbox/inbox pattern when database state and publishing must be reliable.
- Prefer correlation IDs and causation IDs for traceability.
- Do not hide core business invariants in eventually consistent consumers.

## Migration Steps

1. Name one event from a real business fact.
2. Define schema, version, producer, and consumers.
3. Publish after the owning transaction commits.
4. Add one consumer with idempotency storage.
5. Add retry/dead-letter behavior.
6. Add tests for duplicate, missing, and stale events.

## Verification

- `graphify explain "<event name>"` should show producer and consumers.
- Contract-test event schema compatibility.
- Test retry and idempotency paths.

## Output Contract

Return: event catalog, topology choice, producer/consumer patch, consistency guarantees, failure handling, and verification.
