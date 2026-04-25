# 0016 - Track inter-agent consensus loop as future plan item

- Date: 2026-04-25
- Status: Accepted

## Context
Current coding harnesses mainly spawn sub-agents and return outputs.
They do not support structured inter-agent communication for iterative bug triage and consensus-building.
Need to capture this gap as a future architecture direction.

## Alternatives
1. Keep existing spawn-only agent model and skip consensus loops.
2. Add informal note in chat only.
3. Add explicit plan item for bounded multi-agent debate and consensus.

## Chosen option
Add explicit future-plan item in PLAN.md for inter-agent communication with configurable debate budget and consensus stop condition.

## Rationale
- Preserves novel product idea in project artifact, not transient chat.
- Defines clear behavioral target: ask peer agent, debate, converge.
- Budget guard prevents unbounded token/time spend.

## Consequences
- Future harness design should include message passing + debate orchestration.
- Need policy for budget unit (turns/tokens/time) and termination criteria.
