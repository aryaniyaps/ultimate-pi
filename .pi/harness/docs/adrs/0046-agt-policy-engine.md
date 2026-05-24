# ADR 0046: AGT policy engine and subagent identity

- **Status:** Accepted
- **Date:** 2026-05-24
- **Deciders:** ultimate-pi harness team

## Context

Harness tool-call governance was split across `policy-gate.ts`, `harness-run-context.ts` (`guardToolCall`), `harness-subagent-policy.ts`, and subprocess-only `harness-subagent-submit.ts`. Subagents spawn with `--no-extensions -e <single-bundle>` and did not load parent `policy-gate.ts`, creating a governance bypass. We need a single declarative engine, npm-shipped policies, subprocess parity, and tamper-evident audit without MCP gateways.

## Decision

1. Adopt `@microsoft/agent-governance-sdk` (pinned in root `package.json`, Public Preview) as the **PolicyEngine** for allow/deny on every `tool_call` when AGT is enabled.
2. Store policies under `.pi/harness/policies/*.yaml` and ship them via npm `files[]`.
3. Implement `.pi/lib/agt/` for policy loading, evaluation-context precomputation (async FS/plan-scope logic stays in harness helpers), per-run identity/delegation/trust/audit.
4. Rewrite `policy-gate.ts` `tool_call` to delegate to AGT when `HARNESS_AGT_POLICY` is not `0`/`false` (default **on**).
5. Replace subprocess extension path with `harness-subagent-governance.ts` (AGT + submit tools in one bundle).
6. Mint parent/subagent identities at spawn; persist under `.pi/harness/runs/<run_id>/agents/<agent_id>/` (gitignored).
7. Fail closed: policy load errors and evaluation throws → deny.

Migration: `HARNESS_AGT_POLICY=0` restores legacy TS paths for one release window; parity tests (`test/harness-agt-policy-parity.test.mjs`) must show zero mismatches before deleting legacy branches.

## Consequences

### Positive

- One enforcement engine and audit trail (`agt-audit.jsonl` per run).
- Subprocess agents governed identically to parent orchestrator.
- Policies versioned in-repo and lintable (`agt lint-policy` optional in CI).

### Negative / trade-offs

- Public Preview SDK may break; pinned version + golden matrix required on upgrade.
- Dual path during flag window increases maintenance until legacy removal.
- Identity material on disk requires run-dir hygiene (already gitignored).

## Test contract surface

- `test/harness-agt-policy-matrix.test.mjs`
- `test/harness-agt-policy-parity.test.mjs`
- `test/harness-agt-policy-load.test.mjs`
- `test/harness-agt-packaging.test.mjs`
- `test/harness-tool-call-hook-chain.test.mjs`
- Extended `node .pi/scripts/harness-verify.mjs` AGT doctor

## References

- [Microsoft Agent Governance Toolkit](https://github.com/microsoft/agent-governance-toolkit)
- [ADR 0001](0001-harness-constitution.md)
- [ADR 0037](0037-subagent-submit-tools.md)
- Plan: AGT policy-gate rewrite (2026-05)
