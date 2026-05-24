# Harness evolution (Phase 3)

Self-healing reads **JSONL first** (`.pi/harness/runs/*/events.jsonl`), not PostHog.

## Components

- `self-healing-rules.json` — pattern → suggested remediation
- `chaos-drill.md` — manual chaos / failure injection checklist

PostHog `harness_*` events are for dashboards; JSONL is the optimization source of truth per ADR 0008.
