---
description: Full strict harness pipeline with locked governance decisions.
argument-hint: "\"<task>\" [--quick] [--risk low|med|high] [--budget <amount>]"
---

# harness-auto

Run full harness flow in one command:

`plan -> execute -> evaluate -> adversary -> severity-policy decision -> commit+PR (no auto-merge)`

## Step 0 — Parse arguments

Read `$ARGUMENTS` and normalize:

- required task: quoted or unquoted first value
- optional flags: `--quick`, `--risk low|med|high`, `--budget <amount>`

If task is missing, stop and return:

`Usage: /harness-auto "<task>" [--quick] [--risk low|med|high] [--budget <amount>]`

## Process contract

1. Build and approve plan packet before any mutation.
2. Execute only approved scope with rollback artifacts.
3. Run independent evaluator then adversarial reviewer.
4. Apply severity policy + strict pre-PR gates.
5. If gates pass, auto-commit and open PR; never auto-merge.

## Locked decisions (must not be changed)

- Always produce a plan packet before mutation.
- Adversarial review is always required.
- Merge blocking authority is severity-policy-engine.
- Router tuning is propose-and-approve only.
- Plan ambiguity must request clarification (no silent guessing).
- Rollback artifact must be revert-commit-ready and include:
  - revert command
  - prepared revert branch
  - patch bundle
- Debate profile is aggressive with locked confidence weights:
  - claim_quality=0.20
  - reproducibility=0.40
  - agreement=0.40
- Strict pre-PR gate is mandatory.
- Post-pass behavior is auto-commit and auto-open-PR.
- Never auto-merge PR.

## Guardrails

- Do not overthink straightforward gate outcomes; enforce gates deterministically.
- Only follow the locked pipeline and governance decisions listed here.
- Never bypass mandatory safety gates, even in `--quick` mode.

## Strict gates

Block commit/PR if any gate fails:

1. Plan gate passed.
2. Execution completed within approved scope.
3. Independent evaluator passed.
4. Adversarial review completed with consensus packet.
5. Severity-policy-engine output is `pass` or `conditional_pass`.
6. Benchmark delta checks passed.
7. Rollback artifacts generated.

## Notes

- `--quick` may reduce breadth, never safety gates.
- `--risk` can tighten behavior, never disable adversary.
- If risk/ambiguity is high, auto-fallback to manual `harness-plan` and wait for clarification.
- If execution must be interrupted safely, run `/harness-abort [reason]`, then restart with `/harness-plan "<task>"`.
- Always output trace bundle ID and incident/rollback references.

## Completion behavior

End with a deterministic handoff block:

1. `Pipeline status` (pass/fail per strict gate).
2. `Trace bundle` and artifact references (`plan`, `eval`, `adversary`, `consensus`, `rollback`).
3. `Policy outcome` (`pass`, `conditional_pass`, `block`, or `human_required`) with one-line rationale.
4. `Next action` (open PR, replan, rollback, or human override path).
