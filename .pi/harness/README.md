# Harness Scaffolding

Phase 1 scaffold for the Pi harness runtime surfaces.

- `specs/` - machine-readable schema contracts and contract notes.
- `runs/` - per-run metadata and trace indexes.
- `incidents/` - incident, override, and rollback trail records.
- `debates/` - debate round artifacts and consensus packets.

This scaffold is intentionally minimal and safe to adopt incrementally.

## Governance Extensions

Governance/runtime enforcement for this harness is implemented as Pi extensions
under `.pi/extensions/` and auto-loaded through the package `pi.extensions`
manifest (`package.json`).

- `policy-gate.ts` - phase state machine + plan-before-mutate enforcement
- `budget-guard.ts` - hard-stop token budget checks + budget exhausted artifacts
- `trace-recorder.ts` - append-only run traces + compact index files
- `review-integrity.ts` - executor/reviewer session-isolation enforcement
- `test-diff-integrity.ts` - suspicious test-diff detection + adversary escalation
- `debate-orchestrator.ts` - headless debate bus + consensus packet emission
