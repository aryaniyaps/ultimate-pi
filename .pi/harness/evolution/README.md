# Harness evolution (Phase 3)

Self-healing and meta-optimization read **JSONL first** (`.pi/harness/runs/*/events.jsonl`), not PostHog.

## Components

- `self-healing-rules.json` — pattern → suggested remediation
- `meta-optimizer.mjs` — scans run index, proposes router/tuning deltas
- `chaos-drill.md` — manual chaos / failure injection checklist

PostHog `harness_*` events are for dashboards; JSONL is the optimization source of truth per ADR 0008.
