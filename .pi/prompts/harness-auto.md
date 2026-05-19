---
description: Full strict harness pipeline with locked governance decisions.
argument-hint: "\"<task>\" [--quick] [--risk low|med|high]"
---

# harness-auto

Pipeline orchestrator — one session, sequential phase handoffs. Invoke **harness-orchestration** skill for agent IDs. Do **not** implement or review inline.

## Step 0 — Parse arguments

- required task (quoted or first token)
- optional: `--quick`, `--risk` (`--budget` reserved/no-op)

If task missing:

`Usage: /harness-auto "<task>" [--quick] [--risk low|med|high] [--budget <amount>]`

## Orchestration (required) — same session

Follow **harness-plan** performance rules (`subagent` with parallel `tasks`, `agentScope: "both"`).

1. **Plan** — follow `/harness-plan` (parallel scouts → parallel decompose/hypothesis → draft PlanPacket → debate rounds → parent `approve_plan` + `create_plan`). No second approval pass.
2. **Execute** — `subagent({ agent: "harness/executor", task: "<HarnessSpawnContext mode execute>" })`; summarize handoff bullets only (do not paste full subprocess log).
3. **Eval** — `subagent({ agent: "harness/evaluator", task: "<mode benchmark>" })` after parent scripts if needed.
4. **Review** — `subagent({ agent: "harness/evaluator", task: "<mode verdict>" })` when strict gates require.
5. **Adversary** — `subagent({ agent: "harness/adversary", ... })`. **Skip when `--quick`**.
6. **Tie-breaker** — `subagent({ agent: "harness/tie-breaker", ... })` only if debate unresolved and **not** `--quick`.
7. **Parent** — apply locked strict gates below; commit/PR only if all pass.

Review agents run in isolated subprocesses via `subagent` (same parent session).

## Locked decisions (do not change)

- Always produce and approve plan before mutation.
- Adversarial review always required **except** `--quick` (evaluator-only gate).
- Severity-policy-engine blocks merge.
- Router tuning propose-and-approve only.
- Plan ambiguity → parent `ask_user` (harness-decisions).
- Rollback artifacts: revert command, revert branch, patch bundle.
- Debate weights: claim_quality=0.20, reproducibility=0.40, agreement=0.40.
- Strict pre-PR gate mandatory; auto-commit + open PR; never auto-merge.

## Strict gates

Block commit/PR if any fails: plan gate, execution in scope, evaluator pass, adversary complete (unless `--quick`), severity-policy pass/conditional_pass, benchmark deltas, rollback artifacts.

## Notes

- `--quick` reduces breadth (skips semantic scout, post-run adversary, tie-breaker), never core safety gates on plan approval or evaluator.
- High risk/ambiguity → stop and recommend manual `/harness-plan` with `ask_user`.
- Interrupt: `/harness-abort [reason]` then `/harness-plan`.
- Artifact refs under active run dir; `/harness-run-status` or `/harness-trace-last` for handoff.

## Completion

1. Pipeline status per gate
2. Artifact references
3. Policy outcome: `pass`, `conditional_pass`, `block`, or `human_required`
4. Next action (PR, replan, rollback, override)
