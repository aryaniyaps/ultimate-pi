# ADR 0036: Implementation research and selective debate

- **Status:** Accepted
- **Date:** 2026-05-19

## Context

ADR 0034–0035 established Darwin research and outcome-based Review Gate debate. Gaps remained:

- No dedicated pass for external solution patterns vs in-repo stack selection.
- Debate always required all four focuses with `min_focus_rounds=4`, even for low-risk tasks.
- Sprint-contract-auditor spawn in code did not match prompt (quality focus).

## Decision

1. **Phase 3.5** — After decompose/hypothesis, parent produces (subprocess optional):
   - `artifacts/implementation-research.yaml` (`PlanImplementationResearchBrief`) — inline and/or `implementation-researcher`
   - `artifacts/stack.yaml` (`PlanStackBrief`) — inline and/or `stack-researcher`
2. Research stays **outside** debate; debate agents cite artifacts, no web tools.
3. **Phase 4d** — `harness_plan_debate_eligibility` (pre-debate only) selects `full | standard | light | fast` and `required_focuses`; persisted on messenger + bus at `harness_debate_open`.
4. **Light profile** — `spec` + `quality` only, `min_focus_rounds=2`, reduced global cap; gate uses stored `required_focuses` (not hardcoded four).
5. **Sprint auditor** — shared `lanesForRound(roundIndex, focus)` spawns sprint lane when `focus === quality` OR `roundIndex >= 4`.
6. **`--quick`** still skips semantic coverage in planning context only; never skips Phase 3.5 artifacts (med/high risk) or debate.

## Profiles

| Profile | When | Focuses | min_focus_rounds |
|---------|------|---------|-------------------|
| full | high risk, material fork, open implementation questions, DAG manual patch, many tensions | all four | 4 |
| standard | default (ambiguous → standard) | all four | 4 |
| light | low risk, no fork, high-confidence implementation + clear stack primary | spec, quality | 2 |
| fast | med/low, clear stack, no open questions | spec, quality | 1 (consolidated `review_gate_mode`) |

See [practice-map.md](../practice-map.md) and [ADR 0040](0040-practice-grounded-orchestration.md).

## Consequences

### Positive

- Better plans on hard tasks (external patterns before WBS).
- Cheaper low-risk plans (light debate).
- Deterministic eligibility and gate alignment.

### Negative

- Extra subagent per plan (implementation-researcher).
- Parents must run eligibility before `harness_debate_open`.

## References

- `.pi/prompts/harness-plan.md`
- `.pi/harness/specs/plan-implementation-research-brief.schema.json`
- `.pi/extensions/lib/plan-debate-eligibility.ts`
- ADR 0034, ADR 0035
