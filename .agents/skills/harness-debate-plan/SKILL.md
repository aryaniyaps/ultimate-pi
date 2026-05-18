---
name: harness-debate-plan
description: Plan-phase Review Gate debate — assemble rounds, token caps, bus envelopes for parent orchestrator.
---

# harness-debate-plan

Use when running **Phase 5** of `/harness-plan` — four Review Gate rounds on the plan debate bus.

## Open

```
/harness-debate-open plan-<run_id>
```

Budget profile **plan**: `max_rounds=4`, `round_token_cap=2000`, `debate_global_cap=12000`.

## Per-round spawn order

1. Round-specific extras (R1: `hypothesis-validator` first, blind)
2. `plan-evaluator`
3. `plan-adversary`
4. R4: `sprint-contract-auditor` (required)
5. `review-integrator`

## Artifacts (YAML)

| Agent | Output path |
|-------|-------------|
| hypothesis-validator | `artifacts/hypothesis-validation-r{N}.yaml` |
| plan-evaluator | `artifacts/validation-turn-r{N}.yaml` |
| plan-adversary | `artifacts/adversary-brief-r{N}.yaml` |
| sprint-contract-auditor | `artifacts/sprint-audit-r{N}.yaml` |
| review-integrator | `artifacts/review-round-r{N}.yaml` |

## Bus envelope

Load `review-round-r{N}.yaml`, validate, then `buildPlanReviewRoundEnvelope` (`.pi/extensions/lib/plan-debate-envelope.ts`) → `/harness-debate-round '<json>'`.

Plan participants only. `StackResearchAgent` uses `artifacts/stack.yaml` claims — no spawn.

## Close

After round 4: `/harness-debate-consensus`. Do not `approve_plan` on `policy_decision: block`.
