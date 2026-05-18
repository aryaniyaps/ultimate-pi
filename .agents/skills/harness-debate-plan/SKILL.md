---
name: harness-debate-plan
description: Plan-phase Review Gate debate — pi-messenger threads, lane YAML, bus tools for parent orchestrator.
---

# harness-debate-plan

Use when running **Phase 5** of `/harness-plan` — four Review Gate rounds with **pi-messenger-style** turn-taking (claims → rebuttals → integrate), then bus submission.

## Open

```
harness_debate_open({})
```

- Debate id is always `plan-<run_id>` (tool normalizes wrong ids).
- Creates `.pi/harness/runs/<run_id>/debate-messenger/` (`inbox/<Agent>/`, `threads/round-N/transcript.jsonl`).

Budget profile **plan**: `max_rounds=4`, `round_token_cap=2000`, `debate_global_cap=12000`.

## Per-round spawn order (P1 sequential lanes)

1. Round-specific lane spawns (write lane YAML with `write_harness_yaml`)
2. `plan-evaluator` → lane artifact + `harness_messenger_post` (claims)
3. `harness_messenger_read_round` → spawn `plan-adversary` with transcript
4. `plan-adversary` → lane artifact + `harness_messenger_post` (rebuttals with `in_reply_to`)
5. R1: `hypothesis-validator` first (blind — no decomposition/PlanPacket in prompt)
6. R4: `sprint-contract-auditor` required before integrator
7. `review-integrator` → integrator draft + `harness_messenger_post` (`integrate`)
8. `harness_debate_submit_round({ round_index, integrator_draft })` — **only** path for `review-round-r{N}.yaml`

| Round | Extra lane artifacts |
|-------|----------------------|
| 1 | `hypothesis-validation-r1.yaml` |
| 4 | `sprint-audit-r4.yaml` (required) |

## Lane artifacts (auto-applied on subagent complete)

When a debate lane subagent finishes, the harness **automatically** writes lane YAML and posts messenger messages (evaluator claims, adversary rebuttals). Look for `harness-debate-next-step` in the transcript.

| Agent | Output path | Messenger |
|-------|-------------|-----------|
| hypothesis-validator | `artifacts/hypothesis-validation-r{N}.yaml` | — |
| plan-evaluator | `artifacts/validation-turn-r{N}.yaml` | `claim` |
| plan-adversary | `artifacts/adversary-brief-r{N}.yaml` | `rebuttal` |
| sprint-contract-auditor | `artifacts/sprint-audit-r{N}.yaml` (R4) | optional |
| review-integrator | *(integrator draft → `harness_debate_submit_round` only)* | `integrate` (on submit) |

Fallback: `harness_debate_apply_lane({ lane, content, round_index? })` if auto-apply missed fenced YAML.

Resume after stop: `harness_debate_round_status({ round_index: N })` then run the listed `next_tool`.

## Messenger tools

```typescript
harness_messenger_post({
  round_index: 1,
  from: "PlanEvaluatorAgent",
  kind: "claim",
  body: "...",
  claim_ids: ["c1", "c2"],
  to: ["broadcast"],
})
harness_messenger_post({
  round_index: 1,
  from: "PlanAdversaryAgent",
  kind: "rebuttal",
  in_reply_to: ["c1"],
  body: "...",
})
harness_messenger_read_round({ round_index: 1 }) // for next spawn prompt
```

## Integrator + bus

`harness_debate_submit_round` validates messenger thread + integrator rules (`review_gate_ready` false when checks fail without `disputes[]`), writes `review-round-r{N}.yaml`, emits bus `kind: round`.

`StackResearchAgent` uses `artifacts/stack.yaml` claims — no spawn.

## Close

After round 4: `harness_debate_consensus`. `approve_plan` is **hard-gated** on lane files, messenger, 4 bus rounds, and consensus not `block`.

Do not `approve_plan` on `policy_decision: block`. On `human_required` → `ask_user` first.
