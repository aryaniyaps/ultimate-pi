# Harness practice map

Source of truth linking harness phases to proven practices (graphify corpus), agents/scripts, spawn topology, and **agent translation** (ADR 0042). Orchestrators and agents should cite this doc when unsure why a lane exists.

See also: [ADRs](adrs/README.md), [ADR 0040](adrs/0040-practice-grounded-orchestration.md), [ADR 0041](adrs/0041-intelligent-planning-reconnaissance.md), [ADR 0042](adrs/0042-agent-native-orchestration.md), [ADR 0043](adrs/0043-path-first-harness-tools.md), [ADR 0044](adrs/0044-harness-steer-loop.md), [`raw/modules/structured-planning.md`](../../../raw/modules/structured-planning.md).

## Agent translation (human practice → agent design)

| Human practice | Agent translation |
|----------------|-------------------|
| Meeting / chair | Parent as **scheduler + gate checker** only |
| Fagan inspection rounds | **Schema-bound probes** + merge (`parallel_probes` profile) |
| Two-pizza cap per batch | **Token/spawn budget** per phase (`harness-spawn-budget.ts`) |
| RACI roles | **Disjoint prompt contexts**, not serial speakers |
| WBS decomposition | **Lake-first `execution_plan`** (few outcomes, bundled context) |
| Sprint / story points | **`executor_strategy` + lake `done_criteria`** |
| Critical path | **`critical_path_lake_ids`** |
| Replan on every failure | **Steer loop** (`implementation_gap`) vs **plan revise** (`plan_gap`) |
| Tool payloads in chat | **Path-first** approve/submit/merge (ADR 0043) |

## Team management rules (all `/harness-*` orchestrators)

1. **Parallelism law** — Parallel `subagent` `tasks` only when outputs are independent inputs to a later merge (implementation ∥ stack research; inspector ∥ adversary in `parallel_probes`). Never parallelize decompose ∥ hypothesis.
2. **Two-pizza cap per batch** — Max 2 research lanes, max 1 optional `planning-context` subagent, max 1 executor, max 1 debate lane agent per `subagent` call (plan-verify may use 2 probes + integrator in separate batches).
3. **No redundant thinkers** — If artifact X exists, downstream agents read it; they do not re-derive (e.g. decompose after `planning-context.yaml`).
4. **Sequential dependency chain** — planning context → problem framing / decompose → hypothesis → research → synthesis/author → DAG → plan-verify → approve → execute → review → (steer)* → policy.
5. **Plan-verify (agent-native)** — For `fast`/`standard`, parallel probes then integrator; parent is chair, not participant. Threaded debate remains for `full` until parity.
6. **Tool intelligence** — Parent chooses graphify, sg, ccc; subprocesses optional. **Path-first:** disk is source of truth; tool args are pointers (ADR 0043).

## `/harness-plan` — Planning Process Group

| Phase | Practice | Agent translation | Actor | Spawn |
|-------|----------|---------------------|-------|-------|
| 0 | Tooling / fast feedback | Pre-index once | Parent + `ccc` | Automatic |
| 1 | Reconnaissance before WBS | **ContextPack** on disk | Parent tools or optional `planning-context` | No default subprocess |
| 2a | Problem framing / lakes | Lake outcomes, not ticket tree | `decompose` or synthesizer section | Sequential after context gate |
| 2b | Hypothesis-driven approach | Falsifiable claim grounded in framing | `hypothesis` or synthesizer | After `artifacts/decomposition.yaml` |
| 3.5 | Spike / external research | Paths in research brief | Researchers optional | Artifacts required |
| 4 | Fork resolution (batched) | One `ask_user` gate | Parent | After 3.5 |
| 4b | Lake-first execution plan | `executor_strategy`, context bundles | `plan-synthesizer` (low/med) or `execution-plan-author` (high) | Single agent |
| 4c | Deterministic quality gate | Script, not LLM | `validate-plan-dag.mjs` | Parent; hard stop |
| 4d | Tailor process to risk | Probe depth, not meeting count | `harness_plan_debate_eligibility` | Pre plan-verify |
| 4e | Architectural intent | Fitness-function spec | `harness/sentrux-steward` optional | When structural risk |
| 5 | Plan-verify (Review Gate) | Parallel probes + integrator | Debate cast / probes | `parallel_probes` or threaded |
| 6 | Baseline + approve | Path-only `approve_plan` | Parent | `approve_plan`, `create_plan` |

### Review Gate — debate RACI (threaded / full profile)

| Agent | Inspection role | Practice | When |
|-------|-----------------|----------|------|
| `hypothesis-validator` | Blind verifier | Independent verification (ADR 0034) | Round 1 / fast path |
| `plan-evaluator` | Inspector | Neutral checklist | Every required focus |
| `plan-adversary` | Red team | Adversarial review | Every required focus |
| `sprint-contract-auditor` | DoD auditor | Sprint contract | `quality` focus |
| `review-integrator` | Recorder | Single round artifact | End of round |
| Parent | Chair | Gates only | Always |

### Plan-verify profiles

| Profile | When | Team shape |
|---------|------|------------|
| `full` | High risk, material fork | Threaded: all four focuses |
| `standard` | Default med | `parallel_probes`: inspector ∥ adversary → integrator |
| `light` | Low risk | Threaded: `spec` + `quality` |
| `fast` | Med/low, clear stack | Consolidated verify + blind hypothesis-validator |

## `/harness-run` — Executing Process Group

| Step | Practice | Agent translation | Actor |
|------|----------|-------------------|-------|
| Gate | Change control | `plan_ready` required | Parent |
| Pre-work | Fitness baseline | `sentrux gate --save` | Parent |
| Work | Single implementer | `executor_strategy` | `harness/running/executor` |
| Post-work | Observation | `sentrux check` / signal artifact | Parent |
| Handoff | Generator–evaluator | `submit_executor_handoff` | Executor |
| Next | Always verify | **`/harness-review`** (not replan on blocked) | Parent routing |


### Executor edit discipline (ADR 0051)

| Practice | Agent rule |
|----------|------------|
| Hash-anchored targeting | `read` → `Anchor§line`; `edit` uses anchors (default harness tools) |
| Batching | All edits per file in one `edit`; independent files same turn when safe |
| Pre-handoff verify | Run `acceptance_checks`; clear lens blockers; then `submit_executor_handoff` |
| Structural refactor | `sg -p` locate → read slice → anchored edit — no `replace_symbol` tools |
| Code search | `sg` / `ccc` only — not `grep`/`find` on executor |

## `/harness-review` — Monitoring and Controlling

| Phase | Practice | Agent translation | Actor |
|-------|----------|-------------------|-------|
| 1 | Automated QC + fitness | Deterministic first | Parent scripts |
| 2 | Measure vs plan | Benchmark on disk | `evaluator` benchmark |
| 3 | Policy audit | Verdict (no fail-fast skip) | `evaluator` verdict |
| 4 | Red team | Tiered: full attempt 1, lite 2+ steer | `adversary` |
| 5 | Outcome + repair brief | Machine routing | Parent + `review-outcome.yaml`, `repair-brief.yaml` |
| 6 | Steer gate | One `ask_user` | harness-decisions |
| 7 | Steer / revise | `implementation_gap` → `/harness-steer`; `plan_gap` → plan revise | ADR 0044 |

`--quick` = deterministic + benchmark + verdict (no adversary). Steer attempts 2+ default to lite review unless `block_merge`.

## `/harness-steer` — Repair sub-cycle (ADR 0044)

| Step | Practice | Actor |
|------|----------|-------|
| 0 | Read review + repair briefs | Parent |
| 1 | Policy phase → `execute` | Parent |
| 2 | Repair scope | `harness/running/executor` `mode: repair` |
| 3 | Re-verify | `/harness-review` |

## Anti-patterns

- **Do not** spawn `decompose` and `hypothesis` in the same parallel `tasks` batch.
- **Do not** run `graphify query` in `decompose` when planning-context coverage is ok (ADR 0041).
- **Do not** parallelize threaded debate lanes in one batch (except `parallel_probes` inspector ∥ adversary per ADR 0042).
- **Do not** let executor or parent self-certify.
- **Do not** stop review on benchmark fail — complete verdict and route via steer (ADR 0044).
- **Do not** tell user to run `/harness-plan "<new task>"` on test failure — use `/harness-steer` with `repair-brief.yaml`.
- **Do not** re-`approve_plan` every steer attempt — only when packet changes.
- **Do not** embed full plan packets in `approve_plan` / `submit_*` tool args (ADR 0043).
