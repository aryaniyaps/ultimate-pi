# ADR-0035: Plan-phase Review Gate and YAML artifacts

## Status

Accepted (2026-05-18)

## Context

`/harness-plan` produced thin PlanPackets (scope + bullets). Post-execute adversarial review (`/harness-critic`) ran too late. Graphify corpus (Structured Planning, ADR-020, Generator–Evaluator) defines WBS, validation, and review gate before baseline.

## Decision

1. **PlanPacket 1.1.0** — required `execution_plan` (phases, work_items, sprint_contract, dag_validation).
2. **YAML on disk** — `plan-packet.yaml`, `research-brief.yaml`, `run-context.yaml`, `artifacts/*.yaml`. JSON Schema unchanged; instances validated after YAML parse.
3. **Review Gate agents** — `stack-researcher`, `execution-plan-author`, debate: `hypothesis-validator`, `plan-evaluator`, `plan-adversary`, `sprint-contract-auditor`, `review-integrator`.
4. **Debate bus** — `debate_id=plan-<run_id>`, plan budget profile (4 rounds, 12k cap), plan-phase consensus prerequisites.
5. **No legacy JSON** plan paths; no pre-debate standalone `hypothesis-eval`.

## Consequences

- Positive: PM-grade plans, deterministic DAG gate, blind hypothesis eval in debate R1.
- Negative: Higher spawn/token cost; `harness-verify` and smoke fixtures must use `.yaml`.

## References

- [ADR-0033](0033-parent-orchestrated-planning.md), [ADR-0034](0034-darwin-plan-research-pipeline.md)
- `raw/decisions/adr-020.md`, `raw/modules/structured-planning.md`
