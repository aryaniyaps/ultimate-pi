# ADR 0049: agents.policy.yaml and native AGT integration

- **Status:** Accepted
- **Date:** 2026-05-24
- **Deciders:** ultimate-pi harness team

## Context

Per-agent tool policy was split across agent `.md` frontmatter, [`harness-subagent-policy.ts`](../../../extensions/lib/harness-subagent-policy.ts), submit registry allowlists, and AGT precompute (`subagent_policy_block`). End users need custom agents under `.pi/agents/` and custom AGT rules under `.pi/policies/` without maintaining three copies. [`agents.manifest.json`](../agents.manifest.json) already pins package agent `.md` integrity (sha256); it must remain separate from runtime tool policy.

## Decision

1. **`agents.policy.yaml` SSOT** — package [`.pi/harness/agents.policy.yaml`](../agents.policy.yaml); project `.pi/agents.policy.yaml`. Defines `kinds` and per-agent `tools` / spawn fields. No `tools` / `disallowed_tools` in harness agent frontmatter.
2. **Native discovery** — vendored [`parseMarkdownAgent`](../../../../vendor/pi-subagents/src/agents.ts) applies policy via [`.pi/lib/agents-policy`](../../../lib/agents-policy.ts) (same loader as AGT and verify).
3. **AGT** — `createAgtPolicyEngine({ packageRoot, projectRoot })` loads package `.pi/harness/policies/` then project `.pi/policies/`. `tool_allowed` comes only from agents-policy; remove `subagent_policy_block` / delete `harness-subagent-policy.ts`.
4. **Subprocess scope** — `subprocessGovernanceExtensionPath` loads governance for **all** subagents when `isAgtGovernanceActive(projectRoot)`; parent `policy-gate` AGT only during harness sessions (`isHarnessProjectEnabled()` + harness flow).
5. **Submit registry** — implementation only (schema + artifact paths); allowlists live in `agents.policy.yaml`.
6. **Verify** — extend [`harness-agents-manifest.mjs`](../../../scripts/harness-agents-manifest.mjs) for policy↔manifest alignment.

## Consequences

### Positive

- One edit surface per agent capability; project extensions without forking harness.
- Integrity manifest unchanged; supply-chain and policy concerns separated.

### Negative / trade-offs

- Vendored pi-subagents delta must be preserved on `npm run vendor:sync-subagents`.
- Agents without policy entry fail closed in subprocess (doctor requires entries for spawnable project agents).

## References

- [ADR 0046](0046-agt-policy-engine.md)
- [ADR 0048](0048-tool-call-hook-order.md)
- [ADR 0037](0037-subagent-submit-tools.md)
