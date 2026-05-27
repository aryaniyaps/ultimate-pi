---
name: harness-sentrux-repair
description: |
  OSS Sentrux capture, diagnostics synthesis, and repair-plan loop for harness runs.
  Use during /harness-run post-work, /harness-review Phase 1/1b, /harness-steer, or when
  artifacts/sentrux-report.json or sentrux-repair-plan.yaml are mentioned. No Sentrux Pro or MCP.
---

# harness-sentrux-repair

Structured structural feedback for ultimate-pi harness (ADR 0052). **OSS CLI only.**

## Artifacts (per run)

| File | Producer |
|------|----------|
| `artifacts/sentrux-report.json` | `harness-sentrux-report.mjs` (single check+gate scan) |
| `artifacts/sentrux-diagnostics.json` | `harness-sentrux-diagnostics.mjs` |
| `artifacts/sentrux-signal.yaml` | report script `--signal` (schema 1.1.0) |
| `artifacts/sentrux-repair-plan.yaml` | `harness/sentrux-repair-advisor` via `submit_sentrux_repair_plan` |

## Commands

```bash
node "$UP_PKG/.pi/scripts/harness-sentrux-report.mjs" --out "<run_dir>" --run-id "<id>" --signal
node "$UP_PKG/.pi/scripts/harness-sentrux-diagnostics.mjs" --report "<run_dir>/artifacts/sentrux-report.json" --out "<run_dir>" --churn
```

Re-run capture only when artifacts are missing or `HARNESS_SENTRUX_RESCAN=1`.

## Phase wiring

- **`/harness-run`** — post-executor capture (replaces separate check+gate + hand-written signal).
- **`/harness-review`** — Phase 1: reuse or capture; Phase 1b: spawn `harness/sentrux-repair-advisor` when violations/degradation.
- **`/harness-steer`** — `repair-brief.yaml` merges `[sentrux:…]` directives from repair plan.

## Agent boundaries

| Agent | Role |
|-------|------|
| `harness/sentrux-steward` | Manifest intent proposals (`submit_sentrux_manifest_proposal`) |
| `harness/sentrux-repair-advisor` | Code repair plan only (`submit_sentrux_repair_plan`); no bash |

## Related

- **sentrux** skill — CLI install, rules sync, gate loop
- **harness-sentrux-setup** — bootstrap manifest/rules
- **harness-review** / **harness-steer** prompts
