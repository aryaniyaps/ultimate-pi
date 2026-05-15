# Harness Scaffolding

Phase 1–2 scaffold for the Pi harness runtime surfaces.

- `specs/` - machine-readable schema contracts and contract notes.
- `runs/` - per-run metadata and trace indexes.
- `incidents/` - incident, override, and rollback trail records.
- `debates/` - debate round artifacts and consensus packets.
- `docs/adrs/` - team-shared Architectural Decision Records ([index](docs/adrs/README.md)).
- `evals/smoke/` - deterministic fixtures (no CI LLM).
- `evolution/` - self-healing rules + meta-optimizer (JSONL-first).
- `corpus/` - ingest notes for graphify/raw sources.

This scaffold is intentionally minimal and safe to adopt incrementally.

## Verification

```bash
npm run harness:verify
```

## Governance Extensions

Governance/runtime enforcement for this harness is implemented as Pi extensions
under `.pi/extensions/` and auto-loaded through the package `pi.extensions`
manifest (`package.json`).

- `policy-gate.ts` - phase state machine + plan-before-mutate enforcement
- `budget-guard.ts` - hard-stop token budget checks + budget exhausted artifacts
- `trace-recorder.ts` - append-only run traces + HarnessRunRecord + compact index
- `harness-telemetry.ts` - PostHog `harness_*` domain events (dual layer with `@posthog/pi`)
- `observation-bus.ts` - normalized HarnessObservation envelopes
- `drift-monitor.ts` - interactive replan/proceed on high plan drift
- `review-integrity.ts` - executor/reviewer session-isolation enforcement
- `test-diff-integrity.ts` - suspicious test-diff detection + adversary escalation
- `debate-orchestrator.ts` - headless debate bus + consensus packet emission

## PostHog

- LLM layer: npm `@posthog/pi` (unchanged)
- Harness layer: `harness-telemetry.ts` — see [ADR 0008](docs/adrs/0008-harness-posthog-telemetry.md)
- Kill switch: `HARNESS_TELEMETRY_ENABLED=false`
