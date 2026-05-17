---
description: Transform a vague task into a rigorous hypothesis via decomposition + DARWIN synthesis, then a strict PlanPacket.
argument-hint: "\"<task>\" [--risk low|med|high] [--budget <amount>] [--quick]"
---

# harness-plan

Parent orchestrator — run planning in **this session**. Subagents explore, decompose, hypothesize, and review; you own `ask_user`, `approve_plan`, and `create_plan`. Never `write` or `edit` `plan-packet.json` — use **`create_plan`** only.

Allowed `subagent_type` values (copy exactly):

- `harness/planning/scout-graphify`
- `harness/planning/scout-structure`
- `harness/planning/scout-semantic`
- `harness/planning/decompose`
- `harness/planning/hypothesis`
- `harness/planning/plan-adversary`
- `harness/planning/hypothesis-eval`

Do **not** spawn `harness/planner` or `harness/planning/planner`.

## Step 0 — Parse arguments

Read `$ARGUMENTS`:

- task statement (required) — **THE QUESTION**
- optional: `--risk low|med|high`, `--budget <amount>`, `--quick`

If task is missing:

`Usage: /harness-plan "<task>" [--risk low|med|high] [--budget <amount>] [--quick]`

`--quick` skips `harness/planning/scout-semantic` only — never skip graphify, structure, decompose, hypothesis, or approval.

## Active plan context

Use injected context only — **do not** read `.pi/harness/specs/*.schema.json` from disk.

If `[HarnessActivePlan]` is present:

- Treat as **revise/amend** unless `/harness-new-run` was used.
- Set `mode: revise` in `HarnessSpawnContext` from `[HarnessRunContext]`.
- **Preserve `plan_id` and `task_id`** from the existing packet when amending.
- Scouts focus on delta vs existing `plan_packet_path`; full re-scout only if scope changed materially.

Otherwise use `HarnessSpawnContext` from `[HarnessRunContext]` with `mode: create`.

## Phase 1 — Parallel scouts (required)

1. Copy `HarnessSpawnContext` from `[HarnessRunContext]` (adjust `risk_level`, `quick`, `mode` from `$ARGUMENTS`).
2. Spawn scouts with **`inherit_context: false`**. Prefer parallel: `run_in_background: true` on each `Agent` call, then `get_subagent_result` for all.

```
Agent({ subagent_type: "harness/planning/scout-graphify", prompt: "<task + HarnessSpawnContext + scout JSON schema>", run_in_background: true })
Agent({ subagent_type: "harness/planning/scout-structure", prompt: "…", run_in_background: true })
```

Skip `harness/planning/scout-semantic` when `--quick` or `quick: true`.

3. Parse each scout’s fenced `json` (`lane`, `status`, `findings`, `key_paths`, `open_questions`).
4. **Partial failure:** require successful **graphify + structure** lanes. Semantic is optional. If a required lane fails, continue with `plan_status: partial` and document gaps in `assumptions`.
5. If JSON parse fails for a lane, summarize free-text output and add an assumption that the lane was unstructured.

## Phase 2 — Decompose (DeepMind-style)

1. Spawn once with merged scout JSON:

```
Agent({ subagent_type: "harness/planning/decompose", prompt: "<HarnessSpawnContext + task + all scout lane JSON>", inherit_context: false })
```

2. Parse `PlanDecompositionBrief` JSON (`problem_restatement`, `core_tension`, `tensions`, `prior_art`, etc.).
3. On parse failure: one retry with “output valid JSON only”; if still failing, abort with `plan_status: needs_clarification`.

## Phase 3 — Hypothesis (DARWIN)

1. Spawn once:

```
Agent({ subagent_type: "harness/planning/hypothesis", prompt: "<HarnessSpawnContext + task + PlanDecompositionBrief + scout summaries>", inherit_context: false })
```

2. Parse `PlanHypothesisBrief` JSON (`primary`, `dialectical_fork`, `alternatives`, `recommended_next_steps`).
3. **Revision cap:** at most **one** re-spawn of `hypothesis` if Phase 6 eval requests revision (see below).

## Phase 4 — Draft PlanPacket + fork clarification (parent)

Map hypothesis → [`PlanPacket`](.pi/harness/specs/plan-packet.schema.json):

| Field | Source |
|-------|--------|
| `scope` | `problem_restatement` (narrowed) + `primary.claim` + `primary.mechanism` (implementation-ready) |
| `assumptions` | `core_tension`, `prior_art.dead_ends`, scout `open_questions`, chosen fork path (if any) |
| `acceptance_checks` | Each `primary.prediction` and `primary.experiment` as verifiable checklist items (min 1) |
| `risk_level` | From `$ARGUMENTS` or infer from fork uncertainty / blast radius |

Build complete draft: `plan_id`, `task_id`, `scope`, `assumptions`, `risk_level`, `acceptance_checks`, `rollback_plan` (`revert_commit_ready: true`, artifacts filled).

Call **`ask_user`** when `dialectical_fork` is material (Path A vs B materially different) **before** Phase 5 reviews.

Assemble `research_brief` for approval:

```json
{
  "decomposition": { /* PlanDecompositionBrief */ },
  "hypothesis": { /* PlanHypothesisBrief */ },
  "eval": null
}
```

## Phase 5 — Parallel reviews

Spawn in parallel (`run_in_background: true`):

```
Agent({ subagent_type: "harness/planning/plan-adversary", prompt: "<HarnessSpawnContext + draft PlanPacket + scout summaries + decomposition human_summary>", inherit_context: false })
Agent({ subagent_type: "harness/planning/hypothesis-eval", prompt: "<original task ONLY + PlanHypothesisBrief JSON — no decomposition, no PlanPacket>", inherit_context: false })
```

1. Parse `PlanAdversaryBrief` — merge `mitigations` into scope, assumptions, or `acceptance_checks`.
2. Parse `PlanHypothesisEval` — set `research_brief.eval`.
3. If `revision_recommended` or testability &lt; 70 or `relevance.passes` is false: re-spawn `hypothesis` once with eval rationale, update PlanPacket + `research_brief.hypothesis`, then re-run **hypothesis-eval** only (not adversary unless PlanPacket changed materially).

Cap: **at most 2** plan-adversary spawns and **at most 2** `approve_plan` rounds per invocation.

## Phase 6 — Approval + persistence (parent)

1. Call **`approve_plan`** with `plan_packet`, `human_summary` (primary claim + fork if any), and `research_brief`.
2. On **Approve** only, call **`create_plan`** with the **same** `plan_packet`.
3. If `create_plan` fails, tell the user to fix validation errors or run `/harness-plan-commit` after approval is recorded.
4. Confirm `[HarnessRunContext]` `plan_ready: true` before handoff.

On **Cancel** or Esc: `plan_status: needs_clarification`; do **not** call `create_plan`.

On **Request changes**: revise draft and re-run phases 4–6 only (re-scout/decompose/hypothesis only if scope changed).

## Recovery and ownership

- Plan only in the **owner** session (`owner_pi_session_id` on run context); otherwise `/harness-use-run`.
- `/harness-plan-commit` only after parent `approve_plan` (Approve) is in the transcript.
- If `plan_ready: true` already, stop — summarize and set `next_command: /harness-run`.

## Parent rules

- Do not mutate project source in plan phase.
- Subagents never call `ask_user`, `approve_plan`, or `create_plan`.
- Do not embed `plan_id=` in spawn prompts for policy sync.

## Completion

- `plan_status`: `ready`, `partial`, or `needs_clarification`
- `risk_level` used
- `plan_review_path` shown for editor review
- `next_command`: `/harness-run` when `ready` (never `/harness-run --plan …`)
