---
name: harness-plan
description: Produce PlanPacket-aligned harness plans before execute phase. Use with /harness-plan, harness-auto plan phase, or when policy-gate requires an approved plan.
---

# harness-plan

## When to use

- User invokes `/harness-plan` or harness-auto planning phase
- Policy gate blocks mutate tools without approved plan
- Drift monitor requests replan (`harness-drift-replan`)

## Workflow

1. Read `.pi/harness/specs/plan-packet.schema.json`.
2. Capture scope, risks, acceptance criteria, and explicit `plan_id`.
3. Persist plan reference in prompt (`plan_id=...`) so policy-gate sets `approvedPlan`.
4. Do not mutate production files in plan phase unless user explicitly requests draft-only outputs.

## Output

Structured plan summary with:

- `plan_id` (stable string)
- Phases to run: plan → execute → evaluate → (adversary if needed) → merge
- Budget hints from env caps (`HARNESS_BUDGET_*`)

## Rules

- context-mode only if compiling large context; never lean-ctx on harness paths.
