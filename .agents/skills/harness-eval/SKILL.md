---
name: harness-eval
description: Run harness evaluation phase and emit EvalVerdict artifacts. Use with /harness-eval, evaluate phase, or before merge promotion.
---

# harness-eval

## When to use

- `/harness-eval` or evaluate phase after execute
- Before merge / release readiness
- After adversary debate when consensus required

## Workflow

1. Read `.pi/harness/specs/eval-verdict.schema.json`.
2. Gather evidence: tests, diff scope, policy state, debate consensus packet.
3. Emit verdict via `pi.appendEntry('harness-eval-verdict', { ... })` pattern (session custom entry).
4. When Sentrux enabled, ensure `harness-sentrux-signal` exists (stub or MCP) per ADR 0006.
5. Deterministic checks: `npm run harness:verify` and project test script.

## Verdict values

Align with schema: `pass`, `conditional_pass`, `block`, `human_required`.

## Rules

- Eval phase must use isolated session when review-integrity is active.
- PostHog: `harness_eval_verdict` is emitted by harness-telemetry on flush — no analyst skill runs in Phase 2.
