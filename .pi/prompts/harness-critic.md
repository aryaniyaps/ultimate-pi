---
description: "Deprecated alias — use /harness-review (includes adversary phase)."
argument-hint: "[--run <run-id>] [--trace <trace-ref>] [--risk low|med|high]"
---

# harness-critic

**This command is deprecated.** Run **`/harness-review`** instead — Phase 4 runs `harness/reviewing/adversary` after benchmark and policy verdict pass (skip with `--quick`).

If you must continue this turn only: forward to `/harness-review` with the same `$ARGUMENTS` (omit `--quick` if you need adversary). Do not spawn adversary in isolation unless the user explicitly requested adversary-only review.
