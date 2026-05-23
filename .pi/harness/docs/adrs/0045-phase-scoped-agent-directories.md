# ADR 0045: Phase-scoped harness agent directories

Status: Accepted
Date: 2026-05-24

## Context

Harness prompts had accumulated mixed agent ids such as `harness/executor`, `harness/evaluator`, and legacy planning `scout-*` agents. The current orchestration model is phase-scoped:

- planning context is parent-led or handled by `harness/planning/planning-context`
- execution is a single running agent
- post-run review is handled by reviewing agents

Flat run/review agent ids made prompt intent less obvious and left legacy planning scout agents discoverable even after ADR 0041 moved reconnaissance to parent tool use plus `planning-context.yaml`.

## Decision

Use phase-scoped agent directories and ids for run/review orchestration:

- `.pi/agents/harness/running/executor.md` → `harness/running/executor`
- `.pi/agents/harness/reviewing/evaluator.md` → `harness/reviewing/evaluator`
- `.pi/agents/harness/reviewing/adversary.md` → `harness/reviewing/adversary`
- `.pi/agents/harness/reviewing/tie-breaker.md` → `harness/reviewing/tie-breaker`

Remove the legacy planning `scout-graphify`, `scout-structure`, and `scout-semantic` agents. Planning reconnaissance is represented by `artifacts/planning-context.yaml` only.

## Consequences

- `/harness-run` must spawn only `harness/running/executor`.
- `/harness-review` must spawn only agents under `harness/reviewing/`.
- Submit-tool allowlists, precheck/topology policy, review-integrity policy, tests, and `agents.manifest.json` track the new ids.
- When post-run review records `next_recommended_command: "/harness-plan (mode: revise)"`, review-integrity treats `harness/planning/*` subagents as a phase handoff, not a review-isolation violation.
- Old scout YAML artifacts no longer satisfy plan approval readiness; `artifacts/planning-context.yaml` is required unless explicitly waived.
