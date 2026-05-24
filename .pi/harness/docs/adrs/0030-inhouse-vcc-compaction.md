# ADR 0030: In-house VCC compaction (vendored pi-vcc)

- **Status:** Accepted
- **Date:** 2026-05-17
- **Deciders:** ultimate-pi harness team

## Context

ultimate-pi depended on the npm package `@sting8k/pi-vcc` for deterministic, view-oriented session compaction (no LLM summarization call). We need that behavior by default for harness sessions, without an external package coupling, while preserving attribution to upstream [pi-vcc](https://github.com/sting8k/pi-vcc) and the conceptual [VCC](https://github.com/lllyasviel/VCC) work.

## Decision

1. Vendor [sting8k/pi-vcc](https://github.com/sting8k/pi-vcc) under `vendor/pi-vcc/` (refresh via `npm run vendor:sync-vcc`), following the pinned-vendor pattern documented in `THIRD_PARTY_NOTICES.md`.
2. Load compaction through [`.pi/extensions/ultimate-pi-vcc.ts`](../../../extensions/ultimate-pi-vcc.ts).
3. Remove `@sting8k/pi-vcc` from `package.json` dependencies and from `.pi/settings*.json` `packages` arrays.
4. **Configuration is env-only** — no JSON config files (`PI_VCC_CONFIG_PATH` and `.pi/pi-vcc-config.json` are not used).
5. **Default:** `HARNESS_VCC_COMPACTION` unset → VCC overrides Pi built-in LLM compaction for `/compact`, auto-threshold, and overflow.
6. **Opt-out:** `HARNESS_VCC_COMPACTION=false` (also `0` / `off`) uses Pi’s LLM compaction for those paths; explicit `/pi-vcc` still uses VCC.
7. **Debug:** `HARNESS_VCC_DEBUG=true` writes `/tmp/pi-vcc-debug.json` on compaction (default off).
8. Settings implementation: [`.pi/extensions/lib/harness-vcc-settings.ts`](../../../extensions/lib/harness-vcc-settings.ts).
9. Compaction telemetry `details.compactor` is `ultimate-pi-vcc`.

## Consequences

### Positive

- No runtime dependency on `@sting8k/pi-vcc` npm; vendored tree is pinned and patchable.
- Harness-default compaction matches ADR intent (deterministic, recall-friendly summaries).
- Operators can revert to LLM compaction per project via one env var.

### Negative / trade-offs

- Maintainer must run `vendor:sync-vcc` to pick up upstream pi-vcc fixes.
- Vendored `loadSettings` re-exports harness env settings from `.pi/extensions/lib/` (couples vendor tree to ultimate-pi layout).

## References

- [THIRD_PARTY_NOTICES.md](../../../../THIRD_PARTY_NOTICES.md)
- [vendor/pi-vcc/UPSTREAM_PIN.md](../../../../vendor/pi-vcc/UPSTREAM_PIN.md)
- [`.env.example`](../../../../.env.example) — `HARNESS_VCC_COMPACTION`, `HARNESS_VCC_DEBUG`
