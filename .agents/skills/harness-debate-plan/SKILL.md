---
name: harness-debate-plan
description: Plan-phase Review Gate debate — pi-messenger threads, lane YAML, bus tools for parent orchestrator.
---

# harness-debate-plan

Review Gate RACI: parent is chair; lane agents provide structured evidence in sequence.

Use when running **Phase 5** of `/harness-plan` — **Fagan-style structured inspection** per focus (`spec` | `wbs` | `schedule` | `quality`). Parent is **chair**; within-round dialogue (claims → rebuttals → clarifications → counters → integrate).

## Inspection roles

| Agent | Role |
|-------|------|
| `hypothesis-validator` | Blind verifier (R1 only) |
| `plan-evaluator` | Inspector (checklist) |
| `plan-adversary` | Red team |
| `sprint-contract-auditor` | DoD auditor (`quality` or round ≥4) |
| `review-integrator` | Recorder / integration PM |

Do **not** add agents for `fast` profile — reduce focuses/rounds only.

## Debate profiles (team size)

| Profile | Mode | Focuses | When |
|---------|------|---------|------|
| `full` | threaded | all four | High risk, fork, open questions |
| `standard` | threaded | all four | Default med risk |
| `light` | threaded | spec, quality | Low risk, high-confidence research |
| `fast` | **consolidated** | spec, quality (one round) | Clear stack, no open questions; escalate to threaded on blockers |

Eligibility: `harness_plan_debate_eligibility` then `harness_debate_open({ debate_profile, required_focuses })`.

## Open

```
harness_debate_open({})
```

- Debate id is always `plan-<run_id>` (tool normalizes wrong ids).
- Creates `.pi/harness/runs/<run_id>/debate-messenger/`.

Budget caps vary by profile (see `plan-debate-eligibility.ts`); standard plan profile uses `min_focus_rounds=4`, `debate_global_cap=80000`.

## Focus coverage

Call `harness_debate_focus_coverage` until all **required** focuses (from eligibility) appear in submitted review rounds and last `review_gate_ready: true`.

## Per-round spawn order (sequential only — no parallel debate subagents)

1. R1: `hypothesis-validator` (blind verifier) before inspector.
2. `plan-evaluator` (inspector) → lane + messenger `claim`.
3. `harness_messenger_read_round` → `plan-adversary` (red team) → `rebuttal`.
4. Ping-pong while `unresolved_claim_ids` and `exchange_count < max` for profile.
5. `sprint-contract-auditor` (DoD) when focus is `quality` or round ≥ 4.
6. `review-integrator` (recorder) → `harness_debate_submit_round`.

**One subagent per `subagent` call** — never batch debate lanes.

Lane YAML + messenger messages **auto-apply** on subagent complete (`harness-debate-next-step`). Fallback: `harness_debate_apply_lane`.

Resume: `harness_debate_round_status({ round_index: N })` → run listed `next_tool`.

## Messenger kinds

| kind | from | when |
|------|------|------|
| claim | PlanEvaluatorAgent | after evaluator lane |
| rebuttal | PlanAdversaryAgent | in_reply_to claim ids |
| clarification | PlanEvaluatorAgent | addresses open claims |
| counter | PlanAdversaryAgent | final pass; concede or dispute |
| integrate | ReviewIntegratorAgent | on submit_round |

## Close

`harness_debate_consensus` when focus coverage complete. `approve_plan` is **hard-gated** on lanes, messenger dialogue completeness, bus rounds, consensus not `block`.

Do not `approve_plan` on `policy_decision: block`. On `human_required` → `ask_user` first.

Rubrics: use the focus-specific checklist ids passed by the parent for the active round.
