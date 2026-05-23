---
name: harness-steer
description: Post-review repair loop via harness-steer and executor repair mode (ADR 0044).
---

# harness-steer

Use after `/harness-review` when `artifacts/review-outcome.yaml` has `remediation_class: implementation_gap`.

1. Read `repair-brief.yaml` and `plan_packet_path` (paths only).
2. Set policy phase `execute`; spawn `harness/running/executor` with `mode: repair`.
3. Always follow with `/harness-review`.

See `.pi/prompts/harness-steer.md` and `.pi/harness/docs/adrs/0044-harness-steer-loop.md`.
