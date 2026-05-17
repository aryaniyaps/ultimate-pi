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
7. After execute, handoff recommends **`/harness-eval`** in the same session; review commands spawn isolated subagents (see ADR 0032). `active-run.json` still supports cross-session recovery when Pi was closed mid-run.
8. `hasApprovedPlanSignal` uses user-visible prompt only; execute requires `plan_ready` from disk validation **and** recorded `ask_user` approval (or `harness-plan-approval` entry).
9. **Plan-phase writes:** policy-gate allows `write`/`edit` only on canonical `.pi/harness/runs/<run_id>/plan-packet.json` after approval; all other paths stay blocked until execute phase.
10. **Approval-before-persist:** agents present the full plan, call `ask_user` (Approve / Request changes / Cancel), then write the packet. `--quick` narrows planning only — it does not skip approval.
11. **`/harness-auto`:** after an approved plan-packet write, policy phase promotes to `execute` in the same agent turn so implementation can proceed without a separate `/harness-run` message.

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
