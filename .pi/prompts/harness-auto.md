---
description: Full strict harness pipeline with locked governance decisions.
argument-hint: "\"<task>\" [--quick] [--risk low|med|high] [--budget <amount>]"
---

# harness-auto

Pipeline orchestrator — one session, sequential `Agent` spawns. Invoke **harness-orchestration** skill for agent IDs. Do **not** implement or review inline.

## Step 0 — Parse arguments

- required task (quoted or first token)
- optional: `--quick`, `--risk`, `--budget`

If task missing:

`Usage: /harness-auto "<task>" [--quick] [--risk low|med|high] [--budget <amount>]`

## Orchestration (required) — same session

1. **Plan** — follow `/harness-plan` parent orchestration (parallel `harness/planning/scout-*`, `decompose`, `hypothesis`, draft PlanPacket, `ask_user` on fork, parallel `plan-adversary` + `hypothesis-eval`, parent `approve_plan` + `create_plan`). Do not spawn `harness/planner`. No second approval pass.
2. **Execute** — spawn `harness/executor` with `HarnessSpawnContext` (`mode: execute`). Summarize handoff bullets for next spawn (do not paste full subagent log).
3. **Eval** — spawn `harness/evaluator` (`mode: benchmark`) after parent scripts if needed.
4. **Review** — spawn `harness/evaluator` (`mode: verdict`) OR rely on eval verdict if policy allows — prefer both when strict gates require.
5. **Adversary** — spawn `harness/adversary` with artifact paths.
6. **Tie-breaker** — spawn `harness/tie-breaker` only if debate unresolved.
7. **Parent** — apply locked strict gates below; commit/PR only if all pass.

No new Pi session for review — subagents use isolated context (`inherit_context: false`).

## Locked decisions (do not change)

- Always produce and approve plan before mutation.
- Adversarial review always required.
- Severity-policy-engine blocks merge.
- Router tuning propose-and-approve only.
- Plan ambiguity → parent `ask_user` (harness-decisions).
- Rollback artifacts: revert command, revert branch, patch bundle.
- Debate weights: claim_quality=0.20, reproducibility=0.40, agreement=0.40.
- Strict pre-PR gate mandatory; auto-commit + open PR; never auto-merge.

## Strict gates

Block commit/PR if any fails: plan gate, execution in scope, evaluator pass, adversary complete, severity-policy pass/conditional_pass, benchmark deltas, rollback artifacts.

## Notes

- `--quick` reduces breadth, never safety gates.
- High risk/ambiguity → stop and recommend manual `/harness-plan` with `ask_user`.
- Interrupt: `/harness-abort [reason]` then `/harness-plan`.
- Artifact refs under active run dir; `/harness-run-status` or `/harness-trace-last` for handoff.

## Completion

1. Pipeline status per gate
2. Artifact references
3. Policy outcome: `pass`, `conditional_pass`, `block`, or `human_required`
4. Next action (PR, replan, rollback, override)
