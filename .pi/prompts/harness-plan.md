---
description: PM-grade harness plan — planning context, implementation research, ExecutionPlan, DAG validation, selective Review Gate debate, approval.
argument-hint: "\"<task>\" [--risk low|med|high] [--quick]"
---

# harness-plan

You are the **planning orchestrator** (agent-native; ADR 0042). Produce an execution baseline (`plan-packet.yaml` + `plan-review.md`) with **lake-sized** outcomes and path-first tools. Parent owns gates: `ask_user`, `approve_plan({ human_summary? })`, `create_plan()`, plan-verify, and scoped writes under `.pi/harness/runs/<run_id>/`.

**Practice map:** `.pi/harness/docs/practice-map.md` — phase → proven practice → agent → spawn topology.

Subagents persist artifacts via scoped **`submit_*`** tools (deterministic YAML under the run dir). Parent uses **`harness_artifact_ready`** to gate phases (no JSON parsing). Parent merges still use **`write_harness_yaml`** for `research-brief.yaml`, `plan-packet.yaml`, `planning-context.yaml`, and integrator patches.

## Allowed subagents

- `harness/planning/planning-context` (optional — prefer parent tools for Phase 1)
- `harness/planning/decompose`
- `harness/planning/hypothesis`
- `harness/planning/implementation-researcher` (optional when parent can spike inline)
- `harness/planning/stack-researcher` (optional when parent can spike inline)
- `harness/planning/plan-synthesizer` (low/med — merges framing + hypothesis + execution plan)
- `harness/planning/execution-plan-author` (high risk or synthesizer decline)
- `harness/planning/hypothesis-validator` (debate R1 only — blind verifier)
- `harness/planning/plan-evaluator` (inspector)
- `harness/planning/plan-adversary` (red team)
- `harness/planning/sprint-contract-auditor` (DoD auditor)
- `harness/planning/review-integrator` (recorder / integration PM)

Legacy (deprecated, ADR 0041): `scout-graphify`, `scout-structure`, `scout-semantic` — do not spawn by default.

Read **harness-debate-plan** skill before Review Gate rounds.

## Team topology (spawn laws)

1. Parallel `tasks` only for **independent** merges (implementation ∥ stack research; plan-evaluator ∥ plan-adversary for `parallel_probes`). **Never** parallelize decompose ∥ hypothesis.
2. Max **2** research lanes, **1** debate agent, **1** optional `planning-context` subagent per `subagent` call.
3. Downstream agents **read** upstream artifacts — do not re-derive (see practice-map anti-patterns).

## Performance rules

1. Use `subagent` with `agentScope: "both"` and parallel `tasks` only where the practice map allows.
2. Each `subagent` call blocks until subprocesses finish.
3. Do **not** set `timeoutMs` unless the user explicitly requests a cap — subagents run until natural completion (optional backstop: `PI_SUBAGENT_TIMEOUT_MS`).
4. Choose tools and subprocesses by task need — do not spawn lanes for ceremony. Hard gates (DAG, debate, approval) are never skipped for budget.
5. Compact task text: embed spawn context + lane instructions. Prefer `HarnessSpawnContext={"run_id":"…","plan_packet_path":"…",…}` or a JSON object with `"HarnessSpawnContext":{…}` — both parse; `run_id` is required so subprocess submit tools get `HARNESS_RUN_ID`.

## Step 0 — Parse `$ARGUMENTS`

- task (required)
- `--risk low|med|high`, `--quick` (`--budget` is reserved/no-op; token budgets are telemetry-only unless `HARNESS_BUDGET_ENFORCE=1`)

`--quick` skips **semantic** coverage in planning context and post-run adversary only — **never** skip adequate reconnaissance (`planning-context.yaml`), decompose, hypothesis, Phase 3.5 **artifacts**, execution plan, DAG validation, or **Review Gate debate**.

## Active plan context

Use `[HarnessActivePlan]` / `[HarnessRunContext]` only. On revise: preserve `plan_id` / `task_id`. Canonical paths: `plan-packet.yaml`, `research-brief.yaml`, `artifacts/*.yaml`.

## Phase 0 — Tooling / fast feedback (automatic)

**Practice:** Invest in iteration speed (Pragmatic Programmer).

Do **not** run `ccc index` or `ccc search --refresh`. The harness runs incremental `ccc index` before subagent spawns when you use subprocesses. Proceed to Phase 1.

## Phase 1 — Reconnaissance before WBS (parent-led, default)

**Practice:** Shared context before scope decomposition — use the right tools for the job (graphify → sg → ccc → read per `AGENTS.md`).

**Default (no subprocess):** As parent, gather reconnaissance with tools as needed for the task:

1. Read `graphify-out/GRAPH_REPORT.md` when present; use `graphify query` / `explain` / `path` for architecture and cross-module relationships.
2. Use `sg -p '…'` for structural surfaces (handlers, types, exports).
3. Use `ccc search` for semantic implementation matches (unless `--quick` — set `coverage.semantic.status: skipped`).
4. Write `artifacts/planning-context.yaml` via `write_harness_yaml` with `schema_version: "1.0.0"`, `status`, `summary`, `coverage` (architecture + structure required; semantic per risk/quick), `findings`, `evidence_refs`, `open_questions`.

**Optional subprocess:** Spawn **at most one** `harness/planning/planning-context` when the brief is large or you need context isolation. Do **not** spawn legacy `scout-*` agents in parallel by default.

Gate: `harness_artifact_ready({ paths: ["artifacts/planning-context.yaml"] })` (legacy trio of `scout-*.yaml` still accepted for one release — see ADR 0041).

## Phase 2a — WBS / scope decomposition (sequential)

**Practice:** PMBOK scope / WBS; Berkun — how the team divides work.

```
subagent({ agentScope: "both", agent: "harness/planning/decompose", task: "<HarnessSpawnContext + path to planning-context.yaml or legacy scout artifacts>" })
```

Gate: `harness_artifact_ready({ paths: ["artifacts/decomposition.yaml"] })`.

Decompose **prior_art** is **internal only** (from Phase 1). External prior art arrives in Phase 3.5.

## Phase 2b — Hypothesis-driven approach (sequential)

**Practice:** Lean exploration — falsifiable claim before plan detail (DARWIN / ADR 0034).

**Requires** `artifacts/decomposition.yaml`. Do **not** spawn in parallel with decompose.

```
subagent({ agentScope: "both", agent: "harness/planning/hypothesis", task: "<HarnessSpawnContext + path to artifacts/decomposition.yaml + planning-context summary>" })
```

Gate: `harness_artifact_ready({ paths: ["artifacts/hypothesis.yaml"] })`.

## Phase 3.5 — Spike / external solution research (required artifacts)

**Practice:** Lean — external patterns before commitment.

**Required outcome:** `artifacts/implementation-research.yaml` and `artifacts/stack.yaml` for med/high risk (recommended for low). **Not** required subprocesses.

**Parent may:** run web research inline and write artifacts via `write_harness_yaml`, or spawn researchers when external spike warrants isolation:

```json
{
  "agentScope": "both",
  "tasks": [
    { "agent": "harness/planning/implementation-researcher", "task": "…" },
    { "agent": "harness/planning/stack-researcher", "task": "…" }
  ]
}
```

- Subagents write via `submit_implementation_research` / `submit_stack_brief`; gate with `harness_artifact_ready` on both paths.
- Merge both into `research-brief.yaml` (`implementation:` + `stack:`) via parent `write_harness_yaml`.
- **Partial failure:** if one lane fails, re-spawn that lane once; if still failing write `artifacts/plan-phase-status.yaml` with `plan_status: partial` and `ask_user`. Do not proceed to Phase 4b without both research artifacts unless `artifacts/plan-phase-waiver.yaml` records an explicit waiver.
- **Web dedup:** implementation owns patterns/repos; stack owns libraries/versions — no overlapping queries.

Document `human_required` waiver in the run trace only when research is genuinely blocked.

On `mode: revise`: re-run implementation-researcher when task scope, acceptance_checks, or >30% work_items change; skip when delta is schedule-only and prior artifact is fresh.

## Phase 4 — Draft shell + fork resolution

**Practice:** Crucial Conversations — pool of shared meaning when forks exist.

Build draft `PlanPacket` (`contract_version: "1.1.0"`):

- `scope`, `assumptions`, `acceptance_checks`, `risk_level`, `rollback_plan`
- `execution_plan` placeholder until Phase 4b

Initialize `research-brief.yaml` with decomposition + hypothesis + Phase 3.5 merges (`write_harness_yaml`).

**`ask_user` on material `dialectical_fork`** after Phase 3.5 merge (evidence-backed — conflicting external patterns may trigger `human_required` from eligibility).

## Phase 4b — Schedule + WBS detail

**Practice:** CPM / `depends_on` scheduling (Kerzner).

```
subagent({ agentScope: "both", agent: "harness/planning/execution-plan-author", task: "<HarnessSpawnContext + PlanImplementationResearchBrief + PlanStackBrief + decomposition/hypothesis>" })
```

Merge `execution_plan` into draft `plan-packet.yaml` (`write_harness_yaml`). Save `artifacts/execution-plan-draft.yaml` the same way.

## Phase 4c — Deterministic quality gate (hard stop)

**Practice:** Harness engineering — never trust the model for graph validity.

```bash
node .pi/scripts/validate-plan-dag.mjs --packet .pi/harness/runs/<run_id>/plan-packet.yaml --write
```

Must **pass** before debate. On fail: fix via author or parent patches, re-run.

## Phase 4e — Architectural intent (optional, risk-tailored)

**Practice:** Architecture governance + integrated change control — evolve **intent** (manifest), not rules.toml, when scope adds bounded contexts.

Spawn **`harness/sentrux-steward`** when **any** apply (after Phase 4b, before Phase 4c):

- Execution plan adds top-level paths not covered by `.pi/harness/sentrux/architecture.manifest.json` layer globs
- Debate eligibility will use `quality` focus and structural coupling is plausible
- Prior run reported `sentrux check` failures on a new boundary class

```
subagent({ agentScope: "both", agent: "harness/sentrux-steward", task: "<HarnessSpawnContext + planning-context + execution-plan-draft + scope paths>" })
```

Gate: `harness_artifact_ready({ paths: ["artifacts/sentrux-manifest-proposal.yaml"] })`.

If `change_class` ≠ `none` and `human_required` → `ask_user` before manifest edits. Chair applies patch, runs `harness-sentrux-bootstrap.mjs --force`, emits `harness-architecture-changed`. See `/harness-sentrux-steward`.

Do **not** spawn on every plan or when changes stay inside existing layer globs.

## Phase 4d — Tailor process to risk

**Practice:** PMBOK tailoring.

```
harness_plan_debate_eligibility({ risk_level, material_fork, dag_pass: true, ... })
```

Pre-debate signals only (no R1 hypothesis output). Default profile **standard** when ambiguous.

If `human_required: true` → `ask_user` before `harness_debate_open`.

Then:

```
harness_debate_open({ debate_profile, required_focuses })
```

Profiles:

| Profile | Review gate | Focuses required | min_focus_rounds |
|---------|-------------|------------------|------------------|
| full | threaded (4 rounds) | spec, wbs, schedule, quality | 4 |
| standard | threaded (4 rounds) | all four | 4 |
| light | threaded (2 rounds) | spec, quality only | 2 |
| fast | **consolidated** (1 round) | spec, quality | 1 |

Med/low non-fork plans with clear stack and no implementation `open_questions` default to **fast** (consolidated). Escalate to threaded rounds only when integrator sets `review_gate_ready: false` or records blockers.

`--quick`: skip semantic coverage in planning context; cap web research (≤2 searches, ≤3 fetches); prefer **fast** eligibility when DAG passes; use consolidated Review Gate when profile is fast.

## Phase 5 — Structured inspection / Review Gate (Fagan-style)

**Practice:** Code Complete collaborative construction; Fagan inspection with rubrics in `planning-rubrics.md`. Parent is **chair**; one debate agent per `subagent` batch.

**Forbidden:** parallel `subagent` calls for any debate lane agent in one batch.

1. Optional: `harness_plan_scope_check` — if `material_drift`, `ask_user` before debate.
2. Drive debate with **`harness_debate_focus_coverage`** and **`harness_debate_round_status({ round_index, debate_round_focus })`** — cover **required_focuses** from eligibility, not always all four.

### Focus coverage (required before consensus)

Each required focus must appear in submitted review artifacts (`review-round-rN.yaml` or `review-round-consolidated.yaml` with `debate_round_focus: all`). Monotonic `round_index` (cap from profile). Consensus only when:

- all **required** focuses covered, **and**
- last round `review_gate_ready: true`, **and**
- `validate-plan-dag.mjs` still passes (re-run after patches).

### Consolidated state machine (`review_gate_mode: consolidated`, profile fast)

```
round_index := 1
debate_round_focus := all
spawn hypothesis-validator (blind verifier)
WHILE NOT ready_for_integrator (harness_debate_round_status round_index=1):
  follow next_tool (inspector, red team, DoD auditor — one subagent per batch)
spawn review-integrator (recorder) → harness_debate_submit_round
IF review_gate_ready false OR blockers: escalate — threaded round per missing focus (spec/wbs/schedule/quality)
harness_debate_focus_coverage → harness_debate_consensus
```

### Threaded state machine (standard/full/light)

```
round_index := next uncovered required focus
debate_round_focus := spec | wbs | schedule | quality for this round

IF round_index == 1:
  spawn hypothesis-validator (blind — no decomposition/PlanPacket/prior debate)
WHILE NOT ready_for_integrator (harness_debate_round_status with debate_round_focus):
  follow next_tool exactly (one subagent per batch)
  IF debate_round_focus == quality OR round_index >= 4:
    spawn sprint-contract-auditor (DoD)
spawn review-integrator → harness_debate_submit_round({ round_index, integrator_draft })
harness_debate_focus_coverage  // repeat until missing required focuses empty
harness_debate_consensus
```

Debate agents **must not** call `web_search` / `web_fetch` — cite `artifacts/implementation-research.yaml` instead.

**Never** end a Phase 5 turn with prose only — next action must be a harness tool or single sequential `subagent`.

**R1 blind rule:** hypothesis-validator sees only task + `PlanHypothesisBrief`.

If R1 `revision_recommended` or `relevance.passes === false`: one `hypothesis` re-spawn, update brief, continue.

**Blockers:** `policy_decision: block` → no `approve_plan`. `human_required` → `ask_user` first.

## Phase 5b — Revise packet

Apply `recommended_packet_patches` from last integrator round. Re-run `validate-plan-dag.mjs`. If >30% work items changed, one partial re-round on affected focus.

Set `research_brief.eval` from R1 `hypothesis-validator` output.

## Phase 6 — Baseline approval (EVM performance baseline)

1. `approve_plan` with `plan_packet`, `human_summary`, `research_brief` (include `implementation` section). Tool blocks when reconnaissance/research/decomposition are missing, planning context is `partial`/`failed`, or `plan-phase-status` is not `ready` (unless `plan-phase-waiver.yaml`).
2. On Approve: `create_plan` with same packet (`contract_version: "1.1.0"` + `execution_plan`).
3. Confirm `plan_ready: true` → `next_command: /harness-run`.

Post-execute review: `/harness-review` (not plan-phase agents).

## Completion

- `plan_status`: ready | partial | needs_clarification
- `plan_review_path` for human review
- DAG `pass` + required focus areas covered + consensus not `block` before ready
