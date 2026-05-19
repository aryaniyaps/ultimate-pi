# ADR-0035: Plan-phase Review Gate and YAML artifacts

## Status

Accepted (2026-05-18); amended 2026-05-19 (outcome-based debate + ping-pong dialogue)

## Context

`/harness-plan` produced thin PlanPackets (scope + bullets). Post-execute adversarial review (`/harness-critic`) ran too late. Graphify corpus (Structured Planning, ADR-020, Generator–Evaluator) defines WBS, validation, and review gate before baseline.

Early implementation treated debate as a fixed four-round checklist with single evaluator→adversary exchange per round, which ended debate on round count rather than focus coverage and quality.

## Decision

1. **PlanPacket 1.1.0** — required `execution_plan` (phases, work_items, sprint_contract, dag_validation).
2. **YAML on disk** — `plan-packet.yaml`, `research-brief.yaml`, `run-context.yaml`, `artifacts/*.yaml`. JSON Schema unchanged; instances validated after YAML parse.
3. **Review Gate agents** — `stack-researcher`, `execution-plan-author`, debate: `hypothesis-validator`, `plan-evaluator`, `plan-adversary`, `sprint-contract-auditor`, `review-integrator`.
4. **Debate bus** — `debate_id=plan-<run_id>`, plan budget profile:
   - `min_focus_rounds=4`, `max_rounds=12`, `max_exchanges_per_round=3`
   - `round_token_cap=8000`, `debate_global_cap=80000`
5. **Outcome-based completion** — consensus `adversarial_debate_completed` when all focuses `spec|wbs|schedule|quality` are covered in submitted review rounds, last `review_gate_ready: true`, and parent DAG validation passes (not `round_count >= 4` alone).
6. **Within-round dialogue** — pi-messenger kinds: `claim`, `rebuttal`, `clarification`, `counter`; parent orchestrates ping-pong via `harness_debate_round_status` / `harness_debate_advance_thread` before integrator.
7. **Sequential debate spawns** — parent must not parallelize debate lane subagents in one batch.
8. **No legacy JSON** plan paths; no pre-debate standalone `hypothesis-eval`.

## Consequences

- Positive: PM-grade plans, deterministic DAG gate, blind hypothesis eval in debate R1, richer evaluator↔adversary threads, extendable round index for partial re-debate.
- Negative: Higher token cost (80k debate cap vs 12k); parent orchestration more stateful; smoke fixtures must include four `debate_round_focus` values.

## References

- [ADR-0033](0033-parent-orchestrated-planning.md), [ADR-0034](0034-darwin-plan-research-pipeline.md)
- `raw/decisions/adr-020.md`, `raw/modules/structured-planning.md`
- `.pi/prompts/planning-rubrics.md`, `.pi/prompts/harness-plan.md` Phase 5
