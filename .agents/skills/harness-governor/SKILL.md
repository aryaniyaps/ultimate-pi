---
name: harness-governor
description: Enforce harness governance phases, policy gates, budgets, and promotion rules. Use during execute, evaluate, merge, or when interpreting policy-gate / budget-guard messages.
---

# harness-governor

## When to use

- Interpreting `harness-policy-violation`, budget exhausted, or review-integrity blocks
- Deciding whether a run may proceed to merge or PR
- Wiring evaluator + Sentrux + drift gates

## Workflow

1. Read current phase from `/harness-policy-status` or session `harness-policy-state`.
2. Check ADRs: constitution (0001), eval promotion (0003), Sentrux (0006), drift (0007), rules lifecycle (0009).
3. For promotion: require eval pass, no abort lock, debate consensus if escalated, Sentrux when `HARNESS_SENTRUX_REQUIRED=true`.
4. After architecture changes: edit `.pi/harness/sentrux/architecture.manifest.json`, then `node "$UP_PKG/.pi/scripts/sentrux-rules-sync.mjs" --force` (see `.pi/scripts/README.md` for `UP_PKG`) or `/harness-sentrux-sync`.
5. Run `node "$UP_PKG/.pi/scripts/harness-verify.mjs"` before claiming release readiness.

## Spec Distiller integration

When refining plans from noisy requirements:

1. Distill user intent into acceptance criteria and non-goals (bullet list).
2. Map criteria to `plan-packet` fields and testable checks.
3. Flag ambiguities as human_required in eval verdict — do not guess scope.
4. Reference graphify wiki or `graphify query` for architecture constraints before execute.

## Rules

- Never auto-merge; harness-auto may open PR only when all gates pass (see release-readiness-report).
- Do not invoke posthog-analyst in Phase 2 (ADR 0005).
