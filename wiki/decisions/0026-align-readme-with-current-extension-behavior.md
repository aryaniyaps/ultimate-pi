# 0026 - Align README extension docs with current `lean-ctx-enforce` behavior

- Date: 2026-04-26
- Status: Accepted

## Context
`README.md` described outdated extension behavior (blocking multiple built-ins and exposing `/system-prompt-status`).
Current `extensions/lean-ctx-enforce.ts` behavior is different: it overrides `read` and `bash`, routes via `lean-ctx` when available, falls back when unavailable, and exposes `/lean-ctx-status`.

## Alternatives
1. Keep README text unchanged.
2. Rewrite README extension section to match current implementation.

## Chosen option
Adopt option 2.

## Rationale
- Prevents operator confusion during setup and usage.
- Keeps docs consistent with accepted ADR 0023 and actual code.
- Reduces support/debug churn caused by stale docs.

## Consequences
- README now reflects real extension scope and commands.
- Users should not expect `/system-prompt-status` or broad built-in blocking behavior.
