---
name: harness-context
description: Compile task-specific harness context using context-mode and graphify. Use for architecture questions, large codebase context before harness-plan or harness-run. NEVER use lean-ctx on harness paths.
---

# harness-context

## When to use

- Preparing context for `/harness-plan`, `/harness-run`, or `/harness-auto`
- Navigating harness-related code and ADRs without reading entire repos

## Mandatory: context-mode only

- Use the **context-mode** npm package / pi integration for compression.
- **Do not** use lean-ctx (`ctx_read`, `ctx_search`, etc.) on harness paths — locked by Phase 2 plan.

## Workflow

1. Read `graphify-out/GRAPH_REPORT.md` or `graphify-out/wiki/index.md` when available.
2. Run `graphify query "<task>"` for god nodes and communities.
3. Use `sg` (ast-grep) for structural code search in `.pi/extensions/` and harness specs.
4. Use context-mode to load maps/signatures for files not being edited.
5. Read ADR index: `.pi/harness/docs/adrs/README.md`.

## Outputs

Compact context block:

- Relevant ADRs (ids + one-line decision)
- Extension entry points (policy-gate, trace-recorder, harness-telemetry)
- Schema versions in play

## Rules

- `./raw/` is graphify source storage; run `graphify update .` after significant harness code changes.
