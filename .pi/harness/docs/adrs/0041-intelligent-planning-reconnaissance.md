# ADR 0041: Intelligent planning reconnaissance (tools over tool-scouts)

- **Status:** Accepted
- **Date:** 2026-05-23

## Context

ADR 0033 and 0040 mandated three parallel planning scouts (`scout-graphify`, `scout-structure`, `scout-semantic`), each bound to one tool family. That enforced coverage but constrained orchestrator intelligence: the parent always paid for three subprocesses even when one tool pass or a short graphify query sufficed.

The graphify corpus (Superpowers: *Rigid Where It Matters, Flexible Where It Doesn't*; context engineering: *Context > Model Intelligence*) supports hard gates on **artifacts and phase order**, not on **how many subprocesses** gather context.

## Decision

1. **Phase 1 default** — Parent compiles `artifacts/planning-context.yaml` using repo tools (`graphify`, `sg`, `ccc`, reads) per task need. No mandatory scout subprocess batch.
2. **Artifact contract** — `plan-planning-context.schema.json` requires `coverage.architecture` and `coverage.structure` at `ok` or `partial`; `coverage.semantic` may be `skipped` when `--quick`.
3. **Optional subprocess** — At most one `harness/planning/planning-context` subagent when isolation warrants; `submit_planning_context` writes the canonical artifact.
4. **Legacy compat (one release)** — `scout-*.yaml` trio still satisfies approval readiness with deprecation warning; `decompose` dedup reads `planning-context` first.
5. **Phase 3.5** — Requires `implementation-research.yaml` and `stack.yaml` for med/high risk; subprocess researchers optional (parent may spike inline).
6. **Spawn topology** — Remove default parallel scout batch rules; keep decompose∥hypothesis and debate sequential laws.

## Consequences

### Positive

- Orchestrator chooses tools and depth by task; fewer ceremonial subprocesses.
- Single shared artifact reduces merge friction and redundant graphify in decompose.
- Hard gates (DAG, debate, approval) unchanged.

### Negative

- Parent context window bears more reconnaissance load unless `planning-context` subagent is used.
- Legacy scout agents remain on disk until removal after deprecation window.

## References

- [practice-map.md](../practice-map.md)
- ADR 0033, ADR 0040
- `.pi/prompts/harness-plan.md`
- `plan-planning-context.schema.json`
