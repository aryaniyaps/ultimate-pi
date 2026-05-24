---
name: concurrency-safety
description: Prevent race conditions and unsafe shared-state behavior. Use when modifying async work, parallel execution, queues, locks, caches, background jobs, shared mutable state, transactions, event handlers, or distributed coordination. Emphasizes idempotency, ordering, isolation, and deterministic tests.
---

# Concurrency Safety

Use this skill when operations may overlap, reorder, duplicate, or observe stale state.

## Workflow

1. Identify shared mutable state and who can access it concurrently.
2. Identify ordering assumptions and whether they are guaranteed.
3. Check for duplicate, delayed, retried, or out-of-order execution.
4. Use appropriate isolation: immutability, ownership, lock, transaction, compare-and-set, queue serialization, or idempotency key.
5. Keep critical sections small and failure-safe.
6. Ensure cleanup/release happens on error paths.
7. Add tests or simulations for duplicate and interleaved operations where practical.

## Review questions

- Can two callers perform this action at once?
- Can this message/job/event be processed twice?
- Can a stale read overwrite newer state?
- Is the operation atomic from the user's perspective?
- Is there a deadlock, starvation, or resource leak risk?

## Avoid

- Assuming single-thread/process execution unless enforced.
- Using time sleeps as correctness guarantees.
- Global mutable state without ownership rules.
