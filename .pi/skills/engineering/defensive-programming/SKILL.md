---
name: defensive-programming
description: Add robustness at trust boundaries and failure-prone code paths. Use when handling external input, persistence, IO, configuration, user data, inter-process calls, events, commands, or invariants. Guides validation, explicit failures, diagnostics, and invalid-state prevention.
---

# Defensive Programming

Use this skill when code must survive bad inputs, partial failures, or violated assumptions.

## Boundary checks

Validate at trust boundaries:

- user or caller input
- configuration and environment
- serialized data
- storage reads
- network/process responses
- event/message payloads
- plugin or extension inputs

## Workflow

1. Identify trusted and untrusted data.
2. State required invariants and preconditions.
3. Normalize or reject invalid input at the boundary.
4. Fail explicitly with useful diagnostics.
5. Preserve causal context while avoiding secret leakage.
6. Make invalid states unrepresentable where practical.
7. Add tests for malformed, missing, boundary, and contradictory inputs.

## Guidelines

- Do not silently coerce ambiguous data.
- Do not swallow errors without observability.
- Distinguish programmer errors from recoverable runtime errors.
- Prefer clear guard clauses over deeply nested defensive logic.
- Keep validation close to where trust changes.
