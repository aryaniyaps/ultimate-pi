---
description: "Deprecated alias — use /harness-review (post-run master orchestrator)."
argument-hint: "[--run <run-id>] [--quick] [--trace <trace-ref>]"
---

# harness-eval

**This command is deprecated.** Run **`/harness-review`** instead — it orchestrates deterministic gates, benchmark eval, policy verdict, and adversary review in one flow (ADR 0039).

If you must continue this turn only: forward all work to `/harness-review` with the same arguments (`$ARGUMENTS`). Do not spawn a separate benchmark-only pass unless the user explicitly asked for benchmark-only diagnostics.
