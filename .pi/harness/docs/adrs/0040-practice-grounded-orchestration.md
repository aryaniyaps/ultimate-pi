# ADR 0040: Practice-grounded orchestration and team topology

- **Status:** Accepted
- **Date:** 2026-05-23

## Context

Harness commands (`/harness-plan`, `/harness-run`, `/harness-review`) already followed structured planning, generator–evaluator separation, and outcome-based debate (ADRs 0032–0039). The graphify corpus (PMBOK process groups, Team Topologies, Code Complete inspection, harness engineering, Lean spikes) was not surfaced in prompts—orchestrators could spawn redundant parallel thinkers (e.g. decompose ∥ hypothesis) and debate lanes without clear RACI.

## Decision

1. **Practice map** — [practice-map.md](../practice-map.md) is the source of truth: phase → practice → agent/script → spawn topology, debate RACI, anti-patterns.
2. **Planning sequence** — After planning context (ADR 0041), **decompose then hypothesis** (sequential invariant). Hypothesis requires `artifacts/decomposition.yaml` (amends ADR 0034). For `low`/`med` risk, a single **plan-synthesizer** spawn may produce decomposition, hypothesis, and `execution_plan` in one pass, but those artifacts must still land on disk before blind validation (ADR 0042)—sequential **invariant**, not necessarily three parent spawn batches.
3. **Reconnaissance dedup** — `decompose` must not run `graphify query` when `artifacts/planning-context.yaml` has `coverage.architecture.status: ok` (legacy: `scout-graphify.yaml` with `status: ok`).
4. **Team topology rules** — Documented in practice-map and orchestration skills:
   - Parallel only for independent merges (implementation ∥ stack; optional legacy scouts ≤3).
   - Max 2 research lanes, 1 optional `planning-context` subagent, 1 executor, 1 debate agent per `subagent` batch.
   - Debate: parent is chair; one agent per batch; Fagan-style roles (inspector, red team, DoD auditor, blind verifier, recorder).
5. **Command prompts** — Name the proven practice per phase; link practice-map.
6. **Profiles** — `fast` consolidated Review Gate documented alongside `light` threaded gate (ADR 0036 amended).

## Consequences

### Positive

- Every harness phase traceable to corpus-backed practice.
- Fewer detached hypotheses and duplicate graphify work (strengthened by ADR 0041 planning-context artifact).
- Clearer debate roster; smaller teams on low-risk plans via `fast`/`light`.

### Negative

- Slightly longer plan phase wall-clock (sequential decompose → hypothesis).
- More documentation for agents to reference.

## References

- [practice-map.md](../practice-map.md)
- ADR 0034, ADR 0036, ADR 0039
- `.pi/prompts/harness-plan.md`, `.pi/prompts/harness-run.md`, `.pi/prompts/harness-review.md`
- `graphify-out/GRAPH_REPORT.md` — Planning / Executing / Monitoring communities, Team Topologies, Harness Engineering
