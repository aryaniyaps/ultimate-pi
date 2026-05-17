# ADR 0033: Parent-orchestrated harness planning

- **Status:** Accepted
- **Date:** 2026-05-17

## Context

`/harness-plan` delegated the full plan lifecycle to a single `harness/planner` subagent. Plans and approval UI were largely invisible in the parent transcript until `get_subagent_result`, and the orchestrator could not call `ask_user` / `approve_plan` / `create_plan` directly.

## Decision

1. **Parent orchestrator** runs `/harness-plan`: parallel read-only scouts under `harness/planning/*`, parent-built `PlanPacket`, `ask_user`, `harness/planning/plan-adversary`, then parent `approve_plan` + `create_plan`.
2. **Planning agents** live in `.pi/agents/harness/planning/` (`scout-graphify`, `scout-structure`, `scout-semantic`, `plan-adversary`). Deprecated `harness/planner` shim retained at old path for one release.
3. **`approve_plan` and `create_plan`** are parent-session tools only; subagents cannot call them.
4. **`classifyHarnessAgent`** treats `harness/planning/*` as read-only (planner kind).

## Consequences

### Positive

- Full plan visible in parent session; editor `plan-review.md` path surfaced from parent.
- Specialized scouts (graphify, ast-grep, ck) run in parallel with clear JSON contracts.
- Pre-approval adversary separate from post-run `harness/adversary`.

### Negative

- More subagent spawns per plan (3 scouts + adversary) vs one planner.
- Parent prompt must parse multiple JSON blocks and handle partial scout failure.

## References

- `.pi/prompts/harness-plan.md`
- `.pi/agents/harness/planning/`
- ADR 0032
