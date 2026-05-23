---
name: harness-plan
description: Agent-native harness plans — lakes/context bundles, planning context, parallel_probes debate profile, plan-synthesizer on low/med risk, path-first approve_plan/create_plan, then DAG + debate.
---

# harness-plan

**Practice map:** `.pi/harness/docs/practice-map.md` · **ADR 0040** · **ADR 0042** · **ADR 0043**.

## When to use

- `/harness-plan`, harness-auto plan phase, drift replan, policy-gate without approved plan

## Team topology (spawn laws)

1. **Parallelism law** — Parallel `tasks` only for independent lanes (implementation ∥ stack ≤2). Never parallelize debate or decompose ∥ hypothesis.
2. **Two-pizza cap** — Max 1 debate agent, 1 optional planning-context subagent, per `subagent` call.
3. **No redundant thinkers** — Read upstream YAML; do not re-run graphify in decompose when `planning-context` architecture coverage is ok.
4. **Sequential chain** — planning context → decompose → hypothesis → research → author → DAG → debate → approve.
5. **Tool intelligence** — Parent picks graphify, sg, ccc by task; no mandatory tool-tied scout subprocesses.

## Workflow (parent orchestrator)

1. **Phase 1:** Compile `artifacts/planning-context.yaml` with tools (default) or optional `planning-context` subagent.
2. **Sequential** decompose → gate `artifacts/decomposition.yaml`.
3. **Sequential** hypothesis (requires decomposition).
4. **Phase 3.5:** `implementation-research.yaml` + `stack.yaml` (parent inline and/or parallel researchers).
5. Draft `PlanPacket` shell; `ask_user` on material fork **after** Phase 3.5.
6. `execution-plan-author` → merge `execution_plan`.
7. **`validate-plan-dag.mjs`** (must pass).
8. **`harness_plan_debate_eligibility`** — `parallel_probes` spawns plan-evaluator ∥ plan-adversary, then integrator round.
9. **`approve_plan({ human_summary? })`** / **`create_plan()`** — packet from `plan_packet_path` on disk (path-first).

`--quick` skips semantic coverage in planning context and post-run adversary only — **not** adequate reconnaissance, implementation/stack artifacts (med/high risk), or plan debate.

## Rules

- On-disk plan artifacts are **YAML** (`plan-packet.yaml`, `research-brief.yaml`, `planning-context.yaml`).
- Subagents read-only; parent writes run artifacts and calls `approve_plan` / `create_plan`.
- context-mode only on harness paths.
- Phase 3.5 artifacts required for med/high risk unless documented waiver.

## Output

`plan_status`, `plan_review_path`, `next_command: /harness-run` when ready.
