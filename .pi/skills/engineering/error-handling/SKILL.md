---
name: error-handling
description: Design predictable, debuggable error behavior. Use when adding or changing failure paths, retries, validation, IO, service calls, event handling, command handling, or user-facing errors. Classifies errors, preserves causes, avoids secret leaks, and separates internal diagnostics from external messages.
---

# Error Handling

Use this skill when a change can fail or when existing failure behavior is unclear.

## Error classes

Classify failures before coding:

- validation: caller supplied invalid data
- domain: business invariant rejected the action
- authorization: actor lacks permission
- not found/conflict: state does not match expectation
- infrastructure: storage, network, filesystem, process, or dependency failed
- transient: retry may succeed
- programmer: bug or violated internal invariant
- unknown: unexpected and should be surfaced with diagnostics

## Workflow

1. Identify who needs to act on the error: caller, user, operator, or developer.
2. Choose error shape consistent with the codebase.
3. Preserve cause/context for diagnostics.
4. Expose only safe, actionable messages externally.
5. Retry only if the operation is safe or idempotent.
6. Add tests for expected failure paths.

## Avoid

- Catch-all handlers that hide defects.
- Retrying non-idempotent operations without safeguards.
- Logging secrets or private data.
- Returning success with partial hidden failure.
