---
name: harness-spec
description: Draft or refine harness artifact contracts under .pi/harness/specs. Use when defining PlanPacket, RunTrace, HarnessRunRecord, eval verdicts, or PostHog event schemas for ultimate-pi.
---

# harness-spec

## When to use

- Adding or bumping harness JSON schemas
- Aligning extensions with contract versions
- Documenting breaking vs compatible schema changes

## Workflow

1. Read `.pi/harness/specs/README.md` for versioning rules (`contract_version`, optional fields only for compatible changes).
2. Edit or add schema under `.pi/harness/specs/`.
3. Update affected extensions to emit matching custom entries.
4. Run `node "$UP_PKG/.pi/scripts/harness-verify.mjs"` (see `.pi/scripts/README.md`).
5. Add or update a formal decision record in the target project's standard decision-log location for breaking changes.

## Rules

- Never use lean-ctx in harness paths; use normal Read/Grep or context-mode via harness-context.
- Keep `@posthog/pi` unchanged; harness events belong in `harness-posthog-event.schema.json`.
