# ADR 0009: Sentrux rules.toml lifecycle

- **Status:** Accepted
- **Date:** 2026-05-15

## Context

Sentrux enforces architecture via [`.sentrux/rules.toml`](https://sentrux.dev/docs/rules-engine/). The harness quality gate must stay aligned when layers, boundaries, or constraints change — not only on initial setup.

## Decision

1. **Canonical source:** [`.pi/harness/sentrux/architecture.manifest.json`](../../sentrux/architecture.manifest.json) — layers, boundaries, global constraints.
2. **Generated artifact:** `.sentrux/rules.toml` — committed to git; managed block between `harness:managed:start/end` markers.
3. **Bootstrap (idempotent):** `node "$UP_PKG/.pi/scripts/harness-sentrux-bootstrap.mjs"` — seeds manifest when missing, runs sync without `--force` when unchanged.
4. **Re-sync command:** `node "$UP_PKG/.pi/scripts/sentrux-rules-sync.mjs" --force` or `harness-sentrux-bootstrap.mjs --force` (resolve `$UP_PKG` via [.pi/scripts/README.md](../../../scripts/README.md)).
5. **Pi command:** `/harness-sentrux-sync` via `sentrux-rules-sync.ts` extension.
6. **When to sync:**
   - `/harness-setup` Step 4.2 (after sentrux CLI install in Step 2.8)
   - After editing `architecture.manifest.json`
   - On `agent_end` when harness phase is `plan` or `merge`
   - `node "$UP_PKG/.pi/scripts/harness-verify.mjs"` fails if manifest hash ≠ last sync (`--check`)
7. **Custom rules:** TOML outside the managed block is preserved on sync.
8. **Skill:** `harness-sentrux-setup` documents bootstrap vs steward vs sync vs observation.
9. **Intent evolution:** `harness/sentrux-steward` proposes JSON Merge Patches via `submit_sentrux_manifest_proposal` → `artifacts/sentrux-manifest-proposal.yaml`, with graphify-first evidence (`graphify-out/GRAPH_REPORT.md`, `graphify query` / `path` / `explain`). Chair applies manifest edits; never silent auto-merge.
10. **Material changes:** `add_layer`, `add_boundary`, `split_layer` require `adr_required` + `ask_user` when `human_required`. `tune_constraint` may proceed with sentrux/graphify evidence only when chair agrees.
11. **Observation vs intent:** `/harness-run` + `/harness-review` run CLI fitness functions; observation failures → replan/fix. Manifest changes → steward + ADR, not directory-tree guessing.

## Consequences

### Positive

- Quality gate and MCP `check_rules` stay current with harness architecture.
- Team shares one rules file in version control.

### Negative

- `max_cc` may need manifest tuning when large UI extensions land (currently 35 for this repo).

## References

- ADR 0006 (Sentrux dual layer)
- `.pi/agents/harness/sentrux-steward.md`, `.pi/prompts/harness-sentrux-steward.md`
- `.pi/harness/specs/sentrux-manifest-proposal.schema.json`, `sentrux-signal.schema.json`
- `.pi/scripts/harness-sentrux-bootstrap.mjs`
- `.pi/scripts/sentrux-rules-sync.mjs`
- `.agents/skills/harness-sentrux-setup/SKILL.md`
- `.pi/extensions/sentrux-rules-sync.ts`
