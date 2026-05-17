---
description: Adversarial reviewer command with reproducible, merge-blocking findings.
argument-hint: "[--run <run-id>] [--trace <trace-ref>] [--risk low|med|high]"
---

# harness-critic

Orchestrator — spawn `harness/adversary`.

## Step 0 — Parse arguments

- optional: `--run <run-id>` (recovery only)
- optional: `--trace <trace-ref>`, `--risk low|med|high`

Happy path: omit `--run`.

## Orchestration (required)

1. Build `HarnessSpawnContext` with `mode: adversary`, run artifacts, plan path, trace refs.
2. Spawn:

```
Agent({ subagent_type: "harness/adversary", prompt: "…" })
```

3. `get_subagent_result` — parse `AdversaryReport` JSON; parent persists for severity policy.

## Parent rules

- Assume hidden regressions until disproven (in subagent).
- No new Pi session required.

## Completion

- `block_merge` decision
- Top findings with repro pointers
- `recommendation`: `proceed`, `conditional_pass`, or `block`
