---
name: harness-sentrux-setup
description: Bootstrap Sentrux architectural rules for harness projects — seed architecture.manifest.json, generate merge-safe .sentrux/rules.toml, and document bootstrap vs --force sync. Use during /harness-setup, when adding Sentrux to a repo, or when rules.toml is missing or out of date.
---

# harness-sentrux-setup

## When to use

- `/harness-setup` Step 4.4 (Sentrux rules bootstrap)
- Target repo has no `.sentrux/rules.toml` or `harness-verify` reports rules out of date
- User edited `.pi/harness/sentrux/architecture.manifest.json` (layers, boundaries, constraints)

## Canonical layout

| Path | Role |
|------|------|
| `.pi/harness/sentrux/architecture.manifest.json` | Source of truth (layers, boundaries, constraints) |
| `.sentrux/rules.toml` | Generated Sentrux rules (commit to git) |
| `.sentrux/.harness-rules-meta.json` | Sync metadata (gitignored) |

Custom TOML **outside** `# --- harness:managed:start/end ---` is preserved on every sync.

## Commands (resolve `UP_PKG` via `.pi/scripts/README.md`)

| Situation | Command |
|-----------|---------|
| First-time / harness-setup (idempotent) | `node "$UP_PKG/.pi/scripts/harness-sentrux-bootstrap.mjs"` |
| After manifest edits | `node "$UP_PKG/.pi/scripts/harness-sentrux-bootstrap.mjs" --force` |
| CI / verify only | `node "$UP_PKG/.pi/scripts/sentrux-rules-sync.mjs" --check` |
| In pi session | `/harness-sentrux-sync` (extension; uses `--force`) |

**Bootstrap vs `--force`:** Default bootstrap/sync skips rewriting `rules.toml` when the manifest hash is unchanged. Use `--force` (or `/harness-sentrux-sync`) after changing `architecture.manifest.json` or when verify reports drift.

## Workflow

1. Ensure Sentrux CLI is installed (`harness-setup` Step 2.8 or `harness-cli-verify.sh`).
2. Run bootstrap from **project root** (not `UP_PKG`):
   ```bash
   node "$UP_PKG/.pi/scripts/harness-sentrux-bootstrap.mjs"
   ```
3. Optional: `sentrux plugin add-standard` (language plugins; harness-setup Step 2.8).
4. Merge sentrux MCP into `.pi/mcp.json` if missing (harness-setup Step 4.2).
5. `sentrux check .` — fix violations or tune manifest `max_cc` / layers.
6. Commit `.sentrux/rules.toml` and project-specific `architecture.manifest.json`.

## External repos

`harness-seed-project-contracts.mjs` (Step 0.5) copies JSON schemas; bootstrap seeds the Sentrux manifest template when absent and sets `project` from `package.json`.

Do **not** copy ultimate-pi's layer paths blindly into unrelated layouts — edit manifest layers/boundaries for the target repo, then `--force` sync.

## References

- ADR 0009 — `.pi/harness/docs/adrs/0009-sentrux-rules-lifecycle.md`
- Scripts — `.pi/scripts/sentrux-rules-sync.mjs`, `harness-sentrux-bootstrap.mjs`
- Agent — `harness/sentrux-bootstrap` (optional delegate for setup-only runs)
