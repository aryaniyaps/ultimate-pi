---
name: harness-eval
description: >-
  Deprecated — use harness-review skill and /harness-review for the full post-run
  gate. This file remains as a pointer for older prompts.
---

# harness-eval (deprecated)

Use **`harness-review`** skill and **`/harness-review`** instead.

The master command runs benchmark + policy verdict (+ adversary unless `--quick`) with `submit_eval_verdict` / `submit_adversary_report` and parent `harness_artifact_ready` gates.
