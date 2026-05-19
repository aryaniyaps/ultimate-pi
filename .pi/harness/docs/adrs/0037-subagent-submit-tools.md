# ADR 0037: Subagent submit tools (replace JSON prose contracts)

**Status:** Accepted  
**Date:** 2026-05-19

## Context

Harness plan/execute agents used fenced JSON in `finalOutput`, requiring the parent orchestrator to parse prose and call `write_harness_yaml`. This was fragile (truncated parallel summaries, invalid JSON, double-hop writes).

Planning agents set `extensions: false` and subprocess spawn used `--no-extensions`, so harness tools were unavailable in children.

## Decision

1. **Option A — subprocess-only extension bundle:** vendored spawn passes `--no-extensions -e .pi/extensions/harness-subagent-submit.ts` for `harness/*` agents with `extensions: false`.
2. **Scoped `submit_*` tools** per agent, validated against `.pi/harness/specs/*.schema.json` (Ajv) and written deterministically under `HARNESS_RUN_DIR`.
3. **Parent gates** via `harness_artifact_ready` (file existence) instead of parsing subprocess JSON.
4. **Debate lanes:** `tool_result` hook prefers last `submit_*` in `details.results[].messages`; skips `finalOutput` auto-apply when submit present (`HARNESS_SUBMIT_TOOLS` default on).
5. **Parent** blocks all `submit_*`; keeps `write_harness_yaml` for merges and debate round submission only.

## Consequences

- Agent frontmatter lists one terminal `submit_*` tool per role.
- `HarnessSpawnContext` must include `run_id` / `run_dir`; bridge sets `HARNESS_RUN_ID`, `HARNESS_RUN_DIR`, `HARNESS_AGENT_ID` on spawn.
- `parseHarnessAgentJson` retained for migration/tests; hot path is tool args.
- See ADR 0038 for budget telemetry-only default.

## References

- `.pi/extensions/harness-subagent-submit.ts`
- `.pi/extensions/lib/harness-subagent-submit-registry.ts`
- `.pi/harness/specs/plan-scout-findings.schema.json`
