---
name: harness-sentrux-setup
description: Bootstrap Sentrux architectural rules for harness projects — seed architecture.manifest.json, generate merge-safe .sentrux/rules.toml, and document bootstrap vs --force sync. Use during /harness-setup, when adding Sentrux to a repo, or when rules.toml is missing or out of date.
---

# harness-sentrux-setup

## When to use

- `/harness-setup` Step 4.2 (Sentrux rules bootstrap)
- Target repo has no `.sentrux/rules.toml` or `harness-verify` reports rules out of date
- User edited `.pi/harness/sentrux/architecture.manifest.json` (layers, boundaries, constraints)

## Roles (do not conflate)

| Role | Agent / command | Layer |
|------|-----------------|-------|
| **Bootstrap** | `harness/sentrux-bootstrap`, `harness-sentrux-bootstrap.mjs` | Greenfield seed + first sync |
| **Steward** | `harness/sentrux-steward`, `/harness-sentrux-steward` | Proposes manifest changes (`artifacts/sentrux-manifest-proposal.yaml`); chair applies |
| **Sync** | `sentrux-rules-sync.mjs`, `/harness-sentrux-sync` | Regenerates `rules.toml` from manifest after intent change |
| **Observation** | `/harness-run`, `/harness-review` | `harness-sentrux-cli.mjs gate --save` / `check` / `gate` → `artifacts/sentrux-signal.yaml` |

Never auto-sync manifest from directory trees. Material manifest edits need steward evidence + chair approval.

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
| Run/review Sentrux observation | `node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" check` / `gate [--save]` |
| In pi session | `/harness-sentrux-sync` (extension; uses `--force`) |

**Bootstrap vs `--force`:** Default bootstrap/sync skips rewriting `rules.toml` when the manifest hash is unchanged. Use `--force` (or `/harness-sentrux-sync`) after changing `architecture.manifest.json` or when verify reports drift.

## Workflow

1. Ensure Sentrux CLI is installed (`harness-setup` Step 2.8 or `harness-cli-verify.sh`).
2. Run bootstrap from **project root** (not `UP_PKG`):
   ```bash
   node "$UP_PKG/.pi/scripts/harness-sentrux-bootstrap.mjs"
   ```
3. Optional: `sentrux plugin add-standard` (language plugins; harness-setup Step 2.8).
4. `node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" check` — fix violations or tune manifest `max_cc` / layers.
5. Commit `.sentrux/rules.toml` and project-specific `architecture.manifest.json`.

## External repos

`harness-seed-project-contracts.mjs` (Step 0.5) copies JSON schemas; bootstrap seeds the Sentrux manifest template when absent and sets `project` from `package.json`.

Do **not** copy ultimate-pi's layer paths blindly into unrelated layouts — edit manifest layers/boundaries for the target repo, then `--force` sync.

## References

- Rules lifecycle policy: manifest is source of truth; bootstrap/sync regenerate rules from approved intent.
- Scripts — `.pi/scripts/sentrux-rules-sync.mjs`, `harness-sentrux-bootstrap.mjs`, `harness-sentrux-cli.mjs`
- Agents — `harness/sentrux-bootstrap` (setup), `harness/sentrux-steward` (intent proposals)
- Specs — `sentrux-manifest-proposal.schema.json`, `sentrux-signal.schema.json`
