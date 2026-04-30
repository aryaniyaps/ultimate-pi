---
type: concept
title: "verification-drift-detection"
created: 2026-04-30
updated: 2026-04-30
status: seed
tags: [#concept, #harness, #testing]
related:
  - "[[execution-feedback-loop]]"
  - "[[grounding-checkpoints]]"
---

# Verification Drift Detection

> [!stub] See [[grounding-checkpoints]] for the harness implementation.

Detects when an agent's implementation drifts away from the spec or when verification results become stale. Part of the execution feedback loop: after each change, verify that the output still matches expected behavior. Drift detection triggers re-grounding — forcing the agent to re-read the spec before continuing.

In the ultimate-pi harness, this is implemented by Layer 3 ([[grounding-checkpoints]]), which enforces smallest-verifiable-change + drift detection on every checkpoint.
