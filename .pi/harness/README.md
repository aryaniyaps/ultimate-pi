# Harness Scaffolding

Phase 1–2 scaffold for the Pi harness runtime surfaces.

- `specs/` - machine-readable schema contracts and contract notes.
- `runs/` - per-run metadata and trace indexes.
- `incidents/` - incident, override, and rollback trail records.
- `debates/` - debate round artifacts and consensus packets.
- `docs/adrs/` - team-shared Architectural Decision Records ([index](docs/adrs/README.md)).
- `evals/smoke/` - deterministic fixtures (no CI LLM).
- `evolution/` - self-healing rules and chaos drills (JSONL-first).
- `corpus/` - ingest notes for graphify/raw sources.
- `sentrux/` - `architecture.manifest.json` source for `.sentrux/rules.toml` ([ADR 0009](docs/adrs/0009-sentrux-rules-lifecycle.md)).

This scaffold is intentionally minimal and safe to adopt incrementally.

## Verification

```bash
UP_PKG="$(node -p "require('path').dirname(require.resolve('ultimate-pi/package.json'))")"
node "$UP_PKG/.pi/scripts/harness-verify.mjs"
node "$UP_PKG/.pi/scripts/harness-sentrux-bootstrap.mjs"       # idempotent bootstrap (/harness-setup)
node "$UP_PKG/.pi/scripts/harness-sentrux-bootstrap.mjs" --force   # after editing sentrux/architecture.manifest.json
```

## Governance Extensions

Governance/runtime enforcement for this harness is implemented as Pi extensions
under `.pi/extensions/` and auto-loaded through the package `pi.extensions`
manifest (`package.json`).

- `harness-run-context.ts` - active run + plan injection; short commands without run/plan args
- `harness-live-widget.ts` - footer status (current/next phase + plain-language status hint; no run id in UI)
- `policy-gate.ts` - phase state machine; tool allow/deny via AGT `PolicyEngine` (YAML under `.pi/harness/policies/`, see [ADR 0046](docs/adrs/0046-agt-policy-engine.md))
- `harness-subagent-governance.ts` - subprocess bundle (AGT + `submit_*` tools)
- `agt-prompt-guard.ts` / `agt-kill-switch.ts` - PromptDefense + kill switch ([ADR 0047](docs/adrs/0047-agt-layered-security.md))
- `budget-guard.ts` - hard-stop token budget checks + budget exhausted artifacts
- `trace-recorder.ts` - append-only run traces + HarnessRunRecord + compact index
- `harness-telemetry.ts` - PostHog `harness_*` domain events (dual layer with `@posthog/pi`)
- `observation-bus.ts` - normalized HarnessObservation envelopes
- `drift-monitor.ts` - interactive replan/proceed on high plan drift
- `sentrux-rules-sync.ts` - sync `.sentrux/rules.toml` from `sentrux/architecture.manifest.json`
- `review-integrity.ts` - executor/reviewer session-isolation enforcement
- `test-diff-integrity.ts` - suspicious test-diff detection + adversary escalation
- `debate-orchestrator.ts` - headless debate bus + consensus packet emission

## PostHog

- LLM layer: npm `@posthog/pi` (unchanged)
- Harness layer: `harness-telemetry.ts` — see [ADR 0008](docs/adrs/0008-harness-posthog-telemetry.md)
- Kill switch: `HARNESS_TELEMETRY_ENABLED=false`
