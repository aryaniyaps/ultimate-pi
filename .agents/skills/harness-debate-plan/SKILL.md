---
name: harness-debate-plan
description: Plan-phase Review Gate debate — pi-messenger threads, lane YAML, bus tools for parent orchestrator.
---

# harness-debate-plan

Use when running **Phase 5** of `/harness-plan` — outcome-based Review Gate with **within-round dialogue** (claims → rebuttals → clarifications → counters → integrate), then bus submission.

## Open

```
harness_debate_open({})
```

- Debate id is always `plan-<run_id>` (tool normalizes wrong ids).
- Creates `.pi/harness/runs/<run_id>/debate-messenger/`.

Budget profile **plan**:

| Field | Value |
|-------|-------|
| min_focus_rounds | 4 |
| max_rounds | 12 |
| max_exchanges_per_round | 3 |
| round_token_cap | 8000 |
| debate_global_cap | 80000 |

## Focus coverage (not “exactly 4 rounds”)

Call `harness_debate_focus_coverage` until all of `spec | wbs | schedule | quality` appear in submitted `review-round-r*.yaml` and last `review_gate_ready: true`.

## Per-round spawn order (sequential only — no parallel debate subagents)

1. R1: `hypothesis-validator` (blind) before evaluator.
2. `plan-evaluator` → lane + messenger `claim`.
3. `harness_messenger_read_round` → `plan-adversary` → `rebuttal`.
4. Ping-pong while `unresolved_claim_ids` and `exchange_count < 3`:
   - `harness_debate_advance_thread({ round_index })` for next spawn hint.
   - Evaluator `clarification` / adversary `counter`.
5. `sprint-contract-auditor` when focus is `quality` or round ≥ 4.
6. `review-integrator` → `harness_debate_submit_round`.

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

Rubrics: `.pi/prompts/planning-rubrics.md`.
