---
name: reliability-design
description: Design code for predictable behavior under faults. Use when touching IO, storage, queues, events, workflows, services, retries, timeouts, background jobs, distributed state, or operator-facing failures. Applies reliability, fault tolerance, partial failure, degradation, and recovery thinking.
---

# Reliability Design

Use this skill when code must keep working, fail safely, or recover under imperfect conditions.

## Workflow

1. Identify failure modes: dependency down, timeout, duplicate work, partial write, stale read, invalid state, resource exhaustion, human/operator error.
2. Decide desired behavior for each important failure: reject, retry, compensate, degrade, queue, alert, or fail fast.
3. Add timeouts and cancellation where waits can hang.
4. Add retries only when operations are safe or idempotent.
5. Preserve enough state/context for recovery.
6. Add observability for failures and recovery paths.
7. Test representative failure modes.

## Design checks

- Is there a single source of truth for critical state?
- Can the operation run twice safely?
- What happens if the process stops halfway?
- What does the caller see during partial failure?
- How will an operator or developer diagnose this?

## Avoid

- Infinite retries.
- Hidden partial success.
- Treating network/storage/process calls as always reliable.
