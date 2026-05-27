# ADR 0052: Sentrux structured repair (OSS diagnostics, no MCP/Pro)

- **Status:** Accepted
- **Date:** 2026-05-27

## Context

Sentrux OSS `check` / `gate` already compute a full `HealthReport` internally, but the free CLI prints violations and a quality line while dropping rich lists (god files, hotspots, complex functions). Sentrux Pro exposes the same shape via MCP `health`. Ultimate-pi harness needs **actionable “what to fix”** for steer/executor without Pro, MCP, or duplicate scans per review phase.

ADR 0006/0009 cover dual-layer trust and manifest lifecycle; ADR 0044 covers steer via `repair-brief.yaml`. Prior `sentrux-signal.yaml` (v1.0.0) was too thin for repair routing.

## Decision

1. **Single scan per run** — Parent runs `harness-sentrux-report.mjs` once (check + gate capture → `artifacts/sentrux-report.json`). Review reuses artifacts unless missing or `HARNESS_SENTRUX_RESCAN=1`.
2. **OSS synthesis** — `harness-sentrux-diagnostics.mjs` builds Pro-shaped `artifacts/sentrux-diagnostics.json` from the report (+ optional git churn, graphify refs). `bottleneck_inferred: true` when not from upstream JSON.
3. **Signal v1.1.0** — `sentrux-signal.yaml` adds `quality_signal`, `violation_count`, `report_path`, `diagnostics_path`, `degraded_reasons`.
4. **Repair advisor subagent** — `harness/sentrux-repair-advisor` (read-only, no bash) submits `artifacts/sentrux-repair-plan.yaml` via `submit_sentrux_repair_plan`. Spawned in `/harness-review` **Phase 1b** before benchmark evaluator when violations or gate degradation exist.
5. **Steer merge** — `synthesizeRepairBrief` prepends `[sentrux:…]` directives from the repair plan into `repair-brief.yaml`.
6. **Upstream optional** — Report script probes `sentrux check --format json`; when available, prefer parsed JSON over stdout heuristics. Track upstream contribution separately (`raw/sentrux-upstream-json-format.md`).

## Consequences

### Positive

- Pro-style repair context without Pro/MCP.
- One CLI scan per run; review/advisor read paths only.
- Clear separation: steward = manifest intent; repair advisor = code fixes.

### Negative

- Stdout parsers must track CLI formatting changes until upstream JSON ships.
- Inferred diagnostics are weaker than native HealthReport serialization.

## References

- [ADR 0006](0006-sentrux-dual-layer.md), [ADR 0009](0009-sentrux-rules-lifecycle.md), [ADR 0044](0044-harness-steer-loop.md)
- `.pi/scripts/harness-sentrux-report.mjs`, `harness-sentrux-diagnostics.mjs`
- `.pi/agents/harness/sentrux-repair-advisor.md`
