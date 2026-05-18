---
description: PM-grade harness plan — scouts, ExecutionPlan, DAG validation, Review Gate debate, approval.
argument-hint: "\"<task>\" [--risk low|med|high] [--budget <amount>] [--quick]"
---

# harness-plan

You are the **planning PM** for this harness run. Produce an execution baseline (`plan-packet.yaml` + `plan-review.md`), not strategy theater. Parent owns `ask_user`, `approve_plan`, `create_plan`, debate bus commands, and YAML writes under `.pi/harness/runs/<run_id>/`.

Never `write`/`edit` the final canonical packet except via **`write_harness_yaml`** for run artifacts and **`create_plan`** after approval. Do not paste JSON into `.yaml` files — subagents emit JSON; you convert via `write_harness_yaml`.

## Allowed subagents

- `harness/planning/scout-graphify`
- `harness/planning/scout-structure`
- `harness/planning/scout-semantic` (skip when `--quick`)
- `harness/planning/decompose`
- `harness/planning/hypothesis`
- `harness/planning/stack-researcher`
- `harness/planning/execution-plan-author`
- `harness/planning/hypothesis-validator` (debate R1 only)
- `harness/planning/plan-evaluator`
- `harness/planning/plan-adversary`
- `harness/planning/sprint-contract-auditor`
- `harness/planning/review-integrator`

Read **harness-debate-plan** skill before Review Gate rounds.

## Performance rules

1. Use `subagent` with `agentScope: "both"` and parallel `tasks` where lanes are independent.
2. Each `subagent` call blocks until subprocesses finish — batch parallel scouts in one `tasks` array.
3. Do **not** set `timeoutMs` unless the user explicitly requests a cap — subagents run until natural completion (optional backstop: `PI_SUBAGENT_TIMEOUT_MS`).
4. Cap: **12** harness subagent invocations per parent session (extension-enforced).
5. Compact task text: embed `HarnessSpawnContext` JSON + lane-specific instructions only.

## Step 0 — Parse `$ARGUMENTS`

- task (required)
- `--risk low|med|high`, `--budget`, `--quick`

`--quick` skips **scout-semantic** and post-run adversary only — **never** skip graphify, structure, decompose, hypothesis, stack research, execution plan, DAG validation, or **4-round plan debate**.

## Active plan context

Use `[HarnessActivePlan]` / `[HarnessRunContext]` only. On revise: preserve `plan_id` / `task_id`. Canonical paths: `plan-packet.yaml`, `research-brief.yaml`, `artifacts/*.yaml`.

## Phase 0 — Semantic index (automatic)

Do **not** run `ccc index` or `ccc search --refresh`. The harness runs incremental `ccc index` before subagent spawns. Proceed directly to Phase 1 scouts.

## Phase 1 — Parallel scouts

```json
{
  "agentScope": "both",
  "tasks": [
    { "agent": "harness/planning/scout-graphify", "task": "<HarnessSpawnContext + graphify lane>" },
    { "agent": "harness/planning/scout-structure", "task": "<HarnessSpawnContext + structure lane>" }
  ]
}
```

Add `harness/planning/scout-semantic` to `tasks` unless `--quick`. Require graphify + structure success. Semantic lane uses `ccc search` only (see `scout-semantic` agent).

## Phase 2 & 3 — Decompose + hypothesis (parallel)

One `subagent` call with `tasks` for `harness/planning/decompose` and `harness/planning/hypothesis`. Parse `PlanDecompositionBrief` and `PlanHypothesisBrief` from outputs. Persist with `write_harness_yaml` → `artifacts/decomposition.yaml` and `artifacts/hypothesis.yaml`.

## Phase 4 — Draft shell + fork

Build draft `PlanPacket` (`contract_version: "1.1.0"`):

- `scope`, `assumptions`, `acceptance_checks`, `risk_level`, `rollback_plan`
- `execution_plan` placeholder until Phase 4b

`ask_user` when `dialectical_fork` is material.

Initialize `research-brief.yaml` with decomposition + hypothesis (`write_harness_yaml`).

## Phase 4a — Stack research

```
subagent({ agentScope: "both", agent: "harness/planning/stack-researcher", task: "<HarnessSpawnContext + stack research brief>" })
```

`write_harness_yaml` → `artifacts/stack.yaml`; merge into `research-brief.yaml` → `stack`.

## Phase 4b — Execution plan author

```
subagent({ agentScope: "both", agent: "harness/planning/execution-plan-author", task: "<HarnessSpawnContext + execution plan brief>" })
```

Merge `execution_plan` into draft `plan-packet.yaml` (`write_harness_yaml`). Save `artifacts/execution-plan-draft.yaml` the same way.

## Phase 4c — DAG validation (hard gate)

```bash
node .pi/scripts/validate-plan-dag.mjs --packet .pi/harness/runs/<run_id>/plan-packet.yaml --write
```

Must **pass** before debate. On fail: fix via author or parent patches, re-run.

## Phase 5 — Review Gate debate (4 rounds, even with `--quick`)

1. `/harness-debate-open plan-<run_id>`
2. For rounds 1–4 (`debate_round_focus`: spec, wbs, schedule, quality):

| Round | Extra spawns (before integrator) |
|-------|----------------------------------|
| 1 | `hypothesis-validator` (blind: task + hypothesis only) → `plan-evaluator` → `plan-adversary` |
| 2 | `plan-evaluator` → `plan-adversary` (optional `sprint-contract-auditor` if done_criteria thin) |
| 3 | `plan-evaluator` → `plan-adversary` |
| 4 | `plan-evaluator` → `plan-adversary` → **`sprint-contract-auditor` (required)** |

Then `review-integrator` → `write_harness_yaml` → `artifacts/review-round-r{N}.yaml` → build bus envelope → `/harness-debate-round '<json>'`.

3. `/harness-debate-consensus` after round 4.

**R1 blind rule:** hypothesis-validator prompt must exclude decomposition, scouts, PlanPacket, prior debate.

If R1 `revision_recommended` or `relevance.passes === false`: one `hypothesis` re-spawn, update brief, continue.

**Blockers:** `policy_decision: block` → do not `approve_plan`. `human_required` → `ask_user` before approval.

## Phase 5b — Revise packet

Apply `recommended_packet_patches` from last integrator round. Re-run `validate-plan-dag.mjs`. If >30% work items changed, one partial re-round on affected focus.

Set `research_brief.eval` from R1 `hypothesis-validator` output.

## Phase 6 — Approval + persistence

1. `approve_plan` with `plan_packet`, `human_summary`, `research_brief` (paths/summaries OK).
2. On Approve: `create_plan` with same packet (`contract_version: "1.1.0"` + `execution_plan`).
3. Confirm `plan_ready: true` → `next_command: /harness-run`.

Post-execute adversary: `/harness-critic` only (not plan-phase agents).

## Completion

- `plan_status`: ready | partial | needs_clarification
- `plan_review_path` for human review
- DAG `pass` + 4 debate rounds + consensus not `block` before ready
