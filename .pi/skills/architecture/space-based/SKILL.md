---
name: space-based
description: "Use when implementing space-based architecture: horizontally scalable processing units, in-memory/distributed state, partitioning, eventual persistence, backpressure, replication, and operational safeguards for high-volume systems."
---

# Space-Based Architecture

Use this skill for systems where database bottlenecks and burst traffic dominate the design.

## Fit

Use for high-volume, bursty, low-latency workloads needing horizontal scaling and elastic processing.
Avoid for ordinary CRUD systems; this pattern adds serious operational complexity.

## Agent Workflow

1. Read `graphify-out/GRAPH_REPORT.md`.
2. Run `graphify query "space-based architecture processing units partitioning replication"`.
3. Identify the scalability bottleneck and partition key.
4. Isolate processing unit logic from persistence.
5. Make state ownership, replication, and recovery explicit.
6. Add load, failover, and backpressure checks.

## Target Shape

```text
codebase/space/
  processing-unit/    # stateless-ish compute plus owned partition state
  partitioning        # keying and routing
  state-store         # distributed/in-memory state port
  persistence-sync    # async persistence/replication
```

## Implementation Rules

- Choose a stable partition key before code changes.
- Processing units own only their partition's hot state.
- Persistence is asynchronous where possible; consistency must be stated.
- Backpressure, retries, and overload behavior are part of the architecture.
- Recovery must rebuild state from durable sources or snapshots.
- Do not introduce distributed cache/state without observability.

## Migration Steps

1. Measure or identify the bottleneck.
2. Extract hot-path processing into a processing-unit boundary.
3. Add a state-store port with one implementation.
4. Route requests/events by partition key.
5. Add async persistence or snapshot/replay.
6. Add load and failover tests around the boundary.

## Verification

- Use graphify to confirm hot path does not synchronously depend on the old bottleneck.
- Test partition routing, duplicate processing, restart recovery, and overloaded dependencies.
- Record latency/throughput assumptions in an ADR.

## Output Contract

Return: bottleneck, partition key, processing-unit patch, state/recovery model, verification, and operational risks.
