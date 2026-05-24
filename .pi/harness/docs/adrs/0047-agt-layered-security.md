# ADR 0047: AGT layered security (rings, prompt defense, workflow, CI)

- **Status:** Accepted
- **Date:** 2026-05-24
- **Deciders:** ultimate-pi harness team

## Context

ADR 0046 covers PolicyEngine rewrite and subprocess identity. AGT also provides execution rings, kill switch, PromptDefense heuristics, workflow sequence rules, SRE circuit breakers, ShadowDiscovery, and GovernanceVerifier — complementary to Sentrux (architecture) and harness eval/review gates (outcomes).

## Decision

1. **Execution rings:** Map harness agent kinds to AGT `ExecutionRing` in `.pi/lib/agt/rings.ts`; enforce on spawn via `RingEnforcer` (planner/evaluator = inner, executor = middle, adversary = restricted).
2. **Kill switch:** `.pi/extensions/agt-kill-switch.ts` arms on `/harness-abort` and repeated policy denies; blocks new spawns and tool calls until reset.
3. **Prompt defense:** `.pi/extensions/agt-prompt-guard.ts` runs `PromptDefenseEvaluator` on `before_agent_start` for slash commands and subprocess task snippets (heuristic, no LLM).
4. **Workflow rules:** `.pi/harness/policies/workflow-sequences.yaml` + `.pi/lib/agt/workflow-history.ts` read observation-bus flags for multi-step gates (mitigate per-action-only policy gap).
5. **SRE hooks:** `.pi/lib/agt/sre-hooks.ts` ties `CircuitBreaker` to `harness-spawn-budget` counters (telemetry + optional hard stop when `HARNESS_AGT_SRE_ENFORCE=1`).
6. **CI attestation:** `harness-verify.mjs` runs policy doctor, golden matrix, optional `agt lint-policy`; promotion may attach `agt-evidence.json` when `HARNESS_AGT_STRICT=1` (see ADR 0003 amendment note in harness README).

AGT does **not** replace Sentrux, review-integrity, budget-guard telemetry default, or `/harness-review` eval/adversary.

## Consequences

### Positive

- Defense-in-depth aligned with OWASP Agentic Top 10 mapping (documented in harness README).
- Deterministic CI (no LLM) for policy, prompt scan, and verify steps.

### Negative / trade-offs

- Kill switch does not terminate already-running subprocesses (documented limitation).
- Workflow history depends on observation-bus completeness.

## References

- [ADR 0046](0046-agt-policy-engine.md)
- [ADR 0003](0003-eval-promotion-gates.md)
- [ADR 0038](0038-budget-telemetry-only.md)
- AGT THREAT_MODEL and LIMITATIONS docs
