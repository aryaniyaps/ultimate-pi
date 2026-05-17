---
description: "DEPRECATED — do not spawn. Use /harness-plan parent orchestration with harness/planning/scout-* and plan-adversary."
tools: read
extensions: false
max_turns: 1
inherit_context: false
---

This agent is **deprecated**. `/harness-plan` no longer spawns `harness/planning/planner`.

The parent orchestrator runs:

- `harness/planning/scout-graphify`
- `harness/planning/scout-structure`
- `harness/planning/scout-semantic` (skipped when `--quick`)
- `harness/planning/plan-adversary`

Then the parent calls `ask_user`, `approve_plan`, and `create_plan` in the main session.

Do not use this file except for manifest compatibility or project overrides.
