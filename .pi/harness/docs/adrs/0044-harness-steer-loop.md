# ADR 0044: Harness steer loop (post-run repair)

- **Status:** Accepted
- **Date:** 2026-05-23

## Context

After `/harness-run`, failed benchmarks or blocked execution previously routed users to `/harness-plan "<new task>"` even when the approved plan was still valid—high friction and duplicate planning context.

## Decision

1. **Always review** — `/harness-run` ends with `next_command: /harness-review` (including `blocked` / partial work). Remove benchmark fail-fast skip of verdict/adversary (ADR 0039 amended).
2. **Review artifacts** — Parent writes `artifacts/review-outcome.yaml` and `artifacts/repair-brief.yaml` (path pointers, not pasted bodies).
3. **Remediation routing** — `review-outcome.remediation_class`: `implementation_gap` → `/harness-steer`; `plan_gap` → `/harness-plan` revise with `repair_brief_path`; `pass` → policy status. **Review outcome wins** over executor `scope_drift` when they disagree; tie → `plan_gap`.
4. **`/harness-steer`** — Thin orchestrator: read briefs, set policy **phase `execute`**, spawn `harness/executor` with `mode: repair`, then `/harness-review` again.
5. **Caps** — `HARNESS_STEER_MAX_ATTEMPTS` (default 3). **Tiered review:** full review on initial run + steer 1; steers 2+ use lite (benchmark + verdict) unless prior `block_merge` or user forces full.
6. **Sentrux** — Refresh baseline or compare new violations only after steer mutations (avoid false degraded on every attempt).
7. **Evaluate-phase writes** — Orchestrator may write review/steer YAML under run `artifacts/` in `evaluate`/`adversary` phase (allowlisted files).

## Consequences

### Positive

- One `approve_plan`; many repair cycles without re-typing tasks.
- `harness-auto` can loop until pass or cap.

### Negative

- Higher review cost on failed runs (mitigated by tiered adversary).

## References

- `.pi/prompts/harness-steer.md`
- `.pi/harness/specs/review-outcome.schema.json`, `repair-brief.schema.json`
- `nextStepAfterOutcome` in `.pi/lib/harness-run-context.ts`
- ADR 0039 (amended), 0043
