# ADR 0043: Path-first harness tool contracts

- **Status:** Accepted
- **Date:** 2026-05-23

## Context

`approve_plan`, `create_plan`, and `submit_*` often pass full YAML/JSON documents in tool arguments when the same bytes already exist under `.pi/harness/runs/<run_id>/`. That duplicates tokens and trains models to carry large structs in chat history.

## Decision

1. **`approve_plan`** — Primary API: `approve_plan({ human_summary?: string })`. Extension loads `plan_packet` from `runCtx.plan_packet_path` and `research-brief.yaml` from the run dir. Optional `plan_packet` / `research_brief` deprecated for one release.
2. **`create_plan`** — Primary API: `create_plan()` or `create_plan({ plan_packet_path?: string })`. Verifies approval marker and optional content hash from approve time.
3. **`submit_*`** — Accept `source_path` under the active run; read, validate, promote to canonical path. `document` remains optional (deprecated).
4. **`merge_harness_yaml`** — Parent merges patches from artifact paths without pasting bodies into tool args.
5. **Tool results** — Return `{ path, sha256, status }` (and ids where relevant), not full documents.

## Safety

- Draft/canonical packet must exist on disk before approve.
- Re-`approve_plan` required when `execution_plan` or `acceptance_checks` change after a `plan_gap` revise (hash gate).

## Consequences

### Positive

- Approval turns stay small in session history.
- Subagents write once to disk; submit is O(path) tokens.

### Negative

- Agents must write drafts before approve/submit (explicit discipline).

## References

- `.pi/extensions/harness-plan-approval.ts`
- `.pi/extensions/lib/harness-subagent-submit-pipeline.ts`
- ADR 0042, 0044
