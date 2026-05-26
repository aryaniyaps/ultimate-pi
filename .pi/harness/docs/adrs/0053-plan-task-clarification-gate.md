# ADR 0053: Plan-phase task clarification gate

- **Status:** Accepted
- **Date:** 2026-05-26
- **Deciders:** ultimate-pi harness team

## Context

`/harness-plan` began with Phase 1 reconnaissance (graphify, ccc, optional planning-context subprocess) before the user’s intent was unambiguous. That burned tokens and subagent time on the wrong problem. `ask_user` appeared only after expensive work (Phase 3.5 forks, debate, approval). Decompose §1.1 duplicated problem clarification too late.

## Decision

Insert **Phase 0 — Task clarification** before full planning:

1. Parent writes `artifacts/task-clarification.yaml` with a canonical `clarified_task`, scope boundaries, draft acceptance checks, and empty `unresolved_questions` when `status: ready`.
2. Codebase reads and web-retrieval are **allowed** during Phase 0 when they help disambiguate the task; the boundary is **phase scope** (no planning subagents, no `planning-context.yaml` or downstream plan artifacts), not a tool ban.
3. Enforce readiness via `harness_artifact_ready`, `write_harness_yaml` / `merge_harness_yaml` write-order, spawn topology, and `validatePlanApprovalReadiness`.
4. Phase 1 inherits Phase 0 `grounding` / `evidence_refs` and sets `planning-context.task_ref` to the clarification artifact.

## Consequences

### Positive

- Ambiguity resolved before reconnaissance, decomposition, research, and debate.
- Single task contract artifact for spawn context and scope checks (`task_summary` syncs on gate pass).
- Prompt-only bypass closed by write-order and spawn guards.

### Negative / trade-offs

- Extra `ask_user` latency on vague tasks (intentional).
- Overlap between Phase 0 investigation and Phase 1 recon unless orchestrator deduplicates via `grounding`.
- Three status vocabularies (`task-clarification.status`, `plan-phase-status`, `last_outcome`) — document which applies when.

## References

- [practice-map.md](../practice-map.md) — Phase 0 / 0a rows
- [.pi/prompts/harness-plan.md](../../../prompts/harness-plan.md)
- [.pi/lib/plan-task-clarification.ts](../../../lib/plan-task-clarification.ts)
- [.pi/harness/specs/plan-task-clarification.schema.json](../specs/plan-task-clarification.schema.json)
