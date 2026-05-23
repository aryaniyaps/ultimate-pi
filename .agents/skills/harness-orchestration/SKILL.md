---
name: harness-orchestration
description: >-
  Orchestrate ultimate-pi harness phases with the native `subagent` tool
  (isolated `pi --mode json` subprocesses). Use for plan/execute/evaluate
  pipelines, L4 verification, optional planning-context, and debate prep.
---

# Harness orchestration

**Practice map:** `.pi/harness/docs/practice-map.md` · **ADR 0040** · **ADR 0041**.

## Team management rules

1. **Parallelism law** — Parallel `tasks` only when outputs are independent inputs to a later merge (implementation ∥ stack). Never parallelize debate lanes or decompose ∥ hypothesis.
2. **Two-pizza cap per batch** — Max 2 research lanes, 1 optional `planning-context` subagent, 1 executor, 1 debate agent per `subagent` call.
3. **No redundant thinkers** — Downstream agents read artifacts; do not re-derive.
4. **Sequential dependency chain** — planning context → decompose → hypothesis → research → author → DAG → debate → approve → execute → **/harness-review** → optional **/harness-steer** loop (ADR 0044).
5. **Path-first parent tools** — `approve_plan`, `create_plan`, `submit_*` via `source_path`, `merge_harness_yaml`, `harness_synthesize_repair_brief`.
6. **Debate = meeting** — Parent is chair; parallel_probes allows evaluator ∥ adversary per batch.
7. **Tool intelligence** — Parent uses graphify, sg, ccc, and reads by task need; subprocesses optional.

## Slash commands = orchestrators

`/harness-*` prompts parse args, call `subagent`, run `ask_user`, write policy-gated artifacts. Phase logic lives in `.pi/agents/harness/*.md` and `.pi/agents/harness/planning/*.md`.

Every spawn includes **HarnessSpawnContext** JSON in the task text (subprocess agents do not get `[HarnessActivePlan]` injection). Use `agentScope: "both"` so package agents under `$UP_PKG/.pi/agents/**` resolve.

Harness subprocesses load **`harness-subagent-submit`** (`PI_HARNESS_SUBPROCESS=1`, `HARNESS_RUN_ID`, `HARNESS_RUN_DIR`). Agents must call their scoped **`submit_*`** tool before exit; parent gates use **`harness_artifact_ready`**.

## Latency rules

1. **Parallel `tasks`** — Phase 3.5 research only (when using subprocesses).
2. **Sequential** — decompose, hypothesis, debate lanes, review evaluator passes.
3. **Compact handoffs** — read artifact paths; never paste full subprocess logs into next spawn.
4. **No spawn cap** — do not pass `timeoutMs` unless the user requests a cap.

## Command → agent

| Command | `agent` |
|---------|---------|
| `/harness-plan` | Parent: planning context (tools) → decompose → hypothesis → Phase 3.5 artifacts → PlanPacket → eligibility + Review Gate → `approve_plan` + `create_plan` |
| `/harness-run` | `harness/executor` (single worker) |
| `/harness-review` | Parent verify → `evaluator` benchmark → `evaluator` verdict → `adversary` → optional `tie-breaker` (ADR 0039) |
| `/harness-eval` | **Deprecated** → `/harness-review` |
| `/harness-critic` | **Deprecated** → `/harness-review` |
| `/harness-auto` | plan per `/harness-plan`; `--quick` skips adversary + tie-breaker in review |

## Review isolation

Spawn `harness/evaluator` / `harness/adversary` via `subagent` in the **same** parent session. `review-integrity` allows `subagent` when `agent` is in the review set.

## ask_user policy

| Role | `ask_user` |
|------|------------|
| Parent orchestrator | Yes (plan clarification, `approve_plan`, router tune) |
| `harness/planning/*` | No — `human_required` in output if stuck |
| `harness/evaluator`, `harness/adversary`, `harness/tie-breaker` | `human_required` in subprocess JSON |
| `harness/executor` | No — parent handles governance |

## Spawn pattern (`/harness-plan`)

**Phase 1 — planning context (parent default):**

- Use `graphify query`, `sg -p`, `ccc search`, and reads as needed.
- Write `artifacts/planning-context.yaml` via `write_harness_yaml`.
- Optional: single `planning-context` subagent when isolation helps.

**Phase 2 — sequential:**

```
subagent decompose → gate decomposition.yaml
subagent hypothesis → gate hypothesis.yaml
```

**Phase 3.5 — research artifacts required:** parent inline and/or parallel `implementation-researcher` + `stack-researcher` (≤2).

Then execution-plan-author, DAG gate, debate eligibility, sequential debate rounds, `approve_plan` + `create_plan`.

## References

- ADR 0032, ADR 0033, ADR 0040, ADR 0041, `.pi/harness/specs/harness-spawn-context.schema.json`
- `node "$UP_PKG/.pi/scripts/harness-agents-manifest.mjs" --check`
