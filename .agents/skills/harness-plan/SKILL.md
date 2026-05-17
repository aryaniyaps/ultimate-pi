---
name: harness-plan
description: Produce PlanPacket-aligned harness plans before execute phase. Use with /harness-plan, harness-auto plan phase, or when policy-gate requires an approved plan.
---

# harness-plan

## When to use

- User invokes `/harness-plan` or harness-auto planning phase
- Policy gate blocks mutate tools without approved plan
- Drift monitor requests replan (`harness-drift-replan`)
- User replies with clarification after `needs_clarification` (extension injects amend context)

## Workflow

1. Read `.pi/harness/specs/plan-packet.schema.json`.
2. If `[HarnessActivePlan]` is present, read the current packet from `plan_packet_path` and revise — do not start greenfield unless `/harness-new-run`.
3. When scope, risk, or acceptance is ambiguous, call `ask_user` (see harness-decisions skill) before finalizing the packet.
4. Capture scope, risks, acceptance criteria, and explicit `plan_id` in the PlanPacket body.
5. **Write** JSON to the canonical path from `[HarnessRunContext]` / `[HarnessActivePlan]` before completing.
6. Do not mutate production files in plan phase unless user explicitly requests draft-only outputs.
7. Extension sets `approvedPlan` / policy `planId` after disk validation — do **not** use `plan_id=...` prompt hacks.

## Output

Structured plan summary with:

- `plan_id` (stable string in the written file)
- Phases to run: plan → execute → evaluate → (adversary if needed) → merge
- Budget hints from env caps (`HARNESS_BUDGET_*`)
- `next_command`: `/harness-run` when ready

## Rules

- context-mode only if compiling large context; never lean-ctx on harness paths.
