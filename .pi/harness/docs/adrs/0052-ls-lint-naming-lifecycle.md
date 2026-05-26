# ADR 0052: ls-lint naming lifecycle

- **Status:** Accepted
- **Date:** 2026-05-26

## Context

Harness projects need deterministic **filesystem naming** fitness functions alongside Sentrux (code architecture). [ls-lint](https://ls-lint.org/) validates file and directory names from `.ls-lint.yml`. The harness must keep naming rules aligned when conventions evolve — not only on initial setup.

## Decision

1. **Canonical source:** [`.pi/harness/ls-lint/naming.manifest.json`](../../ls-lint/naming.manifest.json) — `global_rules`, `scoped_rules`, `ignores`.
2. **Generated artifact:** `.ls-lint.yml` at repo root — committed to git; managed block between `harness:managed:start/end` markers.
3. **Bootstrap (idempotent):** `node "$UP_PKG/.pi/scripts/harness-ls-lint-bootstrap.mjs"` — seeds manifest when missing, runs sync without `--force` when unchanged.
4. **Re-sync:** `node "$UP_PKG/.pi/scripts/ls-lint-rules-sync.mjs" --force` or `harness-ls-lint-bootstrap.mjs --force`.
5. **Pi command:** `/harness-ls-lint-sync` via `ls-lint-rules-sync.ts` extension.
6. **When to sync:**
   - `/harness-setup` Step 4.3 (after ls-lint CLI install in Step 2.9)
   - After editing `naming.manifest.json`
   - On `agent_end` when harness phase is `plan` or `merge`, or `harness-naming-changed`
   - `harness-verify.mjs` fails if manifest hash ≠ last sync (`--check`)
7. **Custom rules:** YAML outside the managed block is preserved on sync.
8. **Skill:** `harness-ls-lint-setup` documents bootstrap vs steward vs sync vs observation.
9. **Intent evolution:** `harness/ls-lint-steward` proposes JSON Merge Patches via `submit_ls_lint_manifest_proposal` → `artifacts/ls-lint-manifest-proposal.yaml`. Chair applies manifest edits; never silent auto-merge from directory trees.
10. **Observation vs intent:** `/harness-run` + `/harness-review` run `harness-ls-lint-cli.mjs` → `artifacts/ls-lint-signal.yaml`. Violations after execute → steer/repair. Manifest changes → steward + ADR when material.

## Consequences

### Positive

- Filename drift is caught before merge with millisecond lint cost.
- Complements Sentrux without conflating path naming with import-layer architecture.

### Negative

- Strict global kebab-case may require scoped rules or ignores for legacy third-party trees (handled via `ignores` and `scoped_rules`).

## References

- ADR 0009 (Sentrux rules lifecycle — parallel pattern)
- `.pi/agents/harness/ls-lint-steward.md`, `.pi/prompts/harness-ls-lint-steward.md`
- `.pi/harness/specs/ls-lint-manifest-proposal.schema.json`, `ls-lint-signal.schema.json`
- `.pi/scripts/harness-ls-lint-bootstrap.mjs`, `ls-lint-rules-sync.mjs`, `harness-ls-lint-cli.mjs`
- `.agents/skills/harness-ls-lint-setup/SKILL.md`
- `.pi/extensions/ls-lint-rules-sync.ts`
