# ADR 0034: Darwin plan research pipeline

- **Status:** Accepted
- **Date:** 2026-05-17

## Context

`/harness-plan` (ADR 0033) parent-orchestrated scouts and a single adversary before approval. Users need vague tasks transformed into rigorous, falsifiable hypotheses before execution plans are approved — not only codebase maps and scope bullets.

## Decision

1. **Always-on research chain** after parallel scouts:
   - `harness/planning/decompose` — DeepMind-style problem decomposition (`PlanDecompositionBrief`)
   - `harness/planning/hypothesis` — DARWIN hypothesis generation (`PlanHypothesisBrief`)
2. **Parent maps hypothesis → PlanPacket** — `plan-packet.schema.json` unchanged; execution gating stable.
3. **Parallel pre-approval reviews:**
   - `harness/planning/plan-adversary` — execution risk on PlanPacket
   - `harness/planning/hypothesis-eval` — blind self-eval (task + hypothesis only)
4. **`approve_plan` optional `research_brief`** — rendered in `plan-review.md`; not written to `plan-packet.json`.
5. **`--quick`** still skips semantic scout only; never skips decompose/hypothesis.

## Consequences

### Positive

- Plans grounded in explicit tensions, falsifiable claims, and experiments.
- Self-eval isolated from decomposition (reduces grade inflation).
- Editor review shows full research narrative plus PlanPacket.

### Negative

- More subagent spawns per plan (scouts + decompose + hypothesis + 2 reviews; optional hypothesis revision).
- Longer plan phase latency and token cost.

## References

- `.pi/prompts/harness-plan.md`
- `.pi/harness/specs/plan-decomposition-brief.schema.json`
- `.pi/harness/specs/plan-hypothesis-brief.schema.json`
- `.pi/harness/specs/plan-hypothesis-eval.schema.json`
- ADR 0033
