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

## Tool menu (pick what the task needs)

Use these in rough priority order — not every tool on every task:

| Need | Tool |
|------|------|
| Architecture, god nodes, cross-file relationships | `graphify-out/GRAPH_REPORT.md`, `graphify query`, `graphify explain`, `graphify path` |
| Structural code patterns | `sg -p '…'` (ast-grep) |
| Semantic implementation search | `ccc search` (harness pre-indexes before subprocess spawns) |
| File detail | context-mode maps/signatures, then targeted reads |
| Harness governance | `.pi/harness/docs/adrs/README.md` |

For `/harness-plan` Phase 1, parent compiles findings into `artifacts/planning-context.yaml` — see **harness-plan** skill.

## Outputs

Compact context block:

- Relevant ADRs (ids + one-line decision)
- Extension entry points (policy-gate, trace-recorder, harness-telemetry)
- Schema versions in play

## Rules

- `./raw/` is graphify source storage; run `graphify update .` after significant harness code changes.
- Subprocesses are optional; prefer parent tool use when reconnaissance fits the parent context window.
