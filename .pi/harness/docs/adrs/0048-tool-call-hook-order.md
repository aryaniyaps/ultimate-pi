# ADR 0048: tool_call hook interaction matrix

- **Status:** Accepted
- **Date:** 2026-05-24
- **Deciders:** ultimate-pi harness team

## Context

Multiple Pi extensions register `tool_call` hooks: `policy-gate` (AGT), `harness-run-context` (coercion + legacy guards), `review-integrity`, `budget-guard`, `test-diff-integrity`, `harness-web-guard`, `harness-lens`, subprocess `harness-subagent-governance`, and `agt-kill-switch`. Block-first semantics must not be overridden by later hooks.

## Decision

1. **Primary deny:** `policy-gate` / subprocess `harness-subagent-governance` via AGT `PolicyEngine` (deny-overrides).
2. **Secondary deny:** `agt-kill-switch` when session armed after abort or repeated denies.
3. **Role separation:** `review-integrity` blocks executor tools during review phases (orthogonal to AGT).
4. **Telemetry-only default:** `budget-guard` does not block (ADR 0038).
5. **Coercion (not security):** `harness-run-context` scoped YAML coercion remains when AGT enabled; policy denies moved to YAML.
6. **Subprocess:** Only `harness-subagent-governance.ts` is loaded (`-e` bundle); parent `policy-gate` does not run in child.

Pi invokes hooks in extension load order; any hook returning `{ block: true }` stops the tool. Tests in `test/harness-tool-call-hook-chain.test.mjs` document paths.

## References

- [ADR 0046](0046-agt-policy-engine.md)
- [ADR 0038](0038-budget-telemetry-only.md)
