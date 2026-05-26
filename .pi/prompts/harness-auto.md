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

Follow **harness-plan** performance rules (`subagent` with `agentScope: "both"`). Use parallel `tasks` only for Phase 3.5 research (≤2 lanes) when subprocesses are needed. Never parallelize decompose∥hypothesis or debate lanes — precheck enforces this.

1. **Plan** — follow `/harness-plan` (task clarification gate → context → lakes/synthesis or sequential framing → research → plan-verify → `approve_plan()` + `create_plan()`). One approval.
2. **Execute** — `harness/running/executor` with `executor_strategy` from packet (default `single_pass` for low/med).
3. **Review** — always **`/harness-review`** after execute (no benchmark fail-fast).
4. **Steer loop** — while `review-outcome.remediation_class === implementation_gap` and `steer_attempt < HARNESS_STEER_MAX_ATTEMPTS`: `/harness-steer` → `/harness-review` (tiered adversary on attempts 2+).
5. **Parent** — apply locked strict gates; commit/PR only when `remediation_class: pass`.

Do **not** call separate `/harness-eval` or `/harness-critic` (deprecated aliases of `/harness-review`).

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

- `--quick` reduces breadth (skips semantic coverage in planning context, post-run adversary, tie-breaker), never core safety gates on plan approval or evaluator.
- High risk/ambiguity → stop and recommend manual `/harness-plan` with `ask_user`.
- Interrupt: `/harness-abort [reason]` then `/harness-plan`.
- Artifact refs under active run dir; use `/harness-trace` for handoff and forensics.

## Completion

1. Pipeline status per gate
2. Artifact references
3. Policy outcome: `pass`, `conditional_pass`, `block`, or `human_required`
4. Next action (PR, replan, rollback, override)
