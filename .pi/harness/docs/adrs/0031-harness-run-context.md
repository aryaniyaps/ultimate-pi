# ADR 0031: Harness active run context

- **Status:** Accepted
- **Date:** 2026-05-17

## Context

Manual harness steps required copying `run_id` and `plan-packet.json` paths between commands. `trace-recorder` minted a new `run_id` on every `agent_start`, splitting artifacts across phases. The live widget exposed raw trace ids.

## Decision

1. Add `.pi/lib/harness-run-context.ts` and `harness-run-context.ts` extension as the single source of truth for active runs.
2. Persist mirrors:
   - `.pi/harness/runs/<run_id>/run-context.json`
   - `.pi/harness/active-run.json` (cross-session pointer for forked eval)
3. Canonical plan path: `.pi/harness/runs/<run_id>/plan-packet.json` — injected via `[HarnessActivePlan]`; no `--plan` on the happy path.
4. **Hook order:** `harness-run-context` `before_agent_start` allocates/reuses `run_id` before `trace-recorder` `agent_start`. Trace writes phase files `trace-<phase>.json` plus rollup `trace.json`.
5. PostHog `harness_run_started` at most once per logical `run_id`.
6. Short commands: `/harness-run`, `/harness-eval`, etc. without args; recovery via `/harness-run-status`, `/harness-use-run`.
7. Review isolation unchanged: after execute, handoff says **new Pi session → `/harness-eval`**; project `active-run.json` binds forked sessions.
8. `hasApprovedPlanSignal` uses user-visible prompt only; execute requires `plan_ready` from disk validation.

## Consequences

### Positive

- One logical run per manual/auto pipeline; forensics and telemetry align.
- Users never copy run ids or plan paths in normal workflows.

### Negative

- Extension ordering and disk reconciliation must stay correct when adding new harness commands.

## References

- `.pi/lib/harness-run-context.ts`
- `.pi/extensions/harness-run-context.ts`
- `.pi/harness/specs/harness-run-context.schema.json`
