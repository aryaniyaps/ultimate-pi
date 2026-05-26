---
name: harness-ls-lint-setup
description: Bootstrap ls-lint filename rules for harness projects — seed naming.manifest.json, generate merge-safe .ls-lint.yml, and document bootstrap vs --force sync. Use during /harness-setup, when adding ls-lint to a repo, or when .ls-lint.yml is missing or out of date.
---

# harness-ls-lint-setup

## When to use

- `/harness-setup` Step 4.3 (ls-lint naming bootstrap)
- Target repo has no `.ls-lint.yml` or `harness-verify` reports naming config drift
- User edited `.pi/harness/ls-lint/naming.manifest.json` (`global_rules`, `scoped_rules`, `ignores`)

## Roles (do not conflate)

| Role | Agent / command | Layer |
|------|-----------------|-------|
| **Bootstrap** | `harness-ls-lint-bootstrap.mjs` | Greenfield seed + first sync |
| **Steward** | `harness/ls-lint-steward`, `/harness-ls-lint-steward` | Proposes manifest changes (`artifacts/ls-lint-manifest-proposal.yaml`); chair applies |
| **Sync** | `ls-lint-rules-sync.mjs`, `/harness-ls-lint-sync` | Regenerates `.ls-lint.yml` from manifest after intent change |
| **Observation** | `/harness-run`, `/harness-review` | `harness-ls-lint-cli.mjs` → `artifacts/ls-lint-signal.yaml` |

Never auto-sync manifest from directory trees. Material manifest edits need steward evidence + chair approval (ADR 0052).

## Canonical layout

| Path | Role |
|------|------|
| `.pi/harness/ls-lint/naming.manifest.json` | Source of truth |
| `.ls-lint.yml` | Generated ls-lint config (commit to git) |
| `.ls-lint/.harness-naming-meta.json` | Sync metadata (gitignored) |

Custom YAML **outside** `# --- harness:managed:start/end ---` is preserved on every sync.

## Commands (resolve `UP_PKG` via `.pi/scripts/README.md`)

| Situation | Command |
|-----------|---------|
| First-time / harness-setup (idempotent) | `node "$UP_PKG/.pi/scripts/harness-ls-lint-bootstrap.mjs"` |
| After manifest edits | `node "$UP_PKG/.pi/scripts/harness-ls-lint-bootstrap.mjs" --force` |
| CI / verify only | `node "$UP_PKG/.pi/scripts/ls-lint-rules-sync.mjs" --check` |
| Run/review observation | `node "$UP_PKG/.pi/scripts/harness-ls-lint-cli.mjs"` or `--json` |
| In pi session | `/harness-ls-lint-sync` (extension; uses `--force`) |

## Workflow

1. Ensure ls-lint CLI is installed (`harness-setup` Step 2.9 or `harness-cli-verify.sh`).
2. Run bootstrap from **project root**:
   ```bash
   node "$UP_PKG/.pi/scripts/harness-ls-lint-bootstrap.mjs"
   ```
3. `node "$UP_PKG/.pi/scripts/harness-ls-lint-cli.mjs"` — fix violations or tune manifest rules/ignores.
4. Commit `.ls-lint.yml` and project-specific `naming.manifest.json`.

## References

- ADR 0052 — `.pi/harness/docs/adrs/0052-ls-lint-naming-lifecycle.md`
- Scripts — `ls-lint-rules-sync.mjs`, `harness-ls-lint-bootstrap.mjs`, `harness-ls-lint-cli.mjs`
- Agent — `harness/ls-lint-steward`
