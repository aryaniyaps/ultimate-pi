---
name: sentrux
description: |
  Architectural quality sensor for AI-assisted code — rules, modularity, session baselines,
  and degradation detection via the Sentrux CLI (not MCP in Pi sessions).
  Use when the user mentions sentrux, quality signal, architectural health, gate, check rules,
  modularity, session baseline, degradation, structural drift, or before/after agent work on
  a harness project. Triggers on: sentrux check, sentrux gate, rules.toml, quality gate.
---

# sentrux (CLI + harness)

[Sentrux](https://github.com/sentrux/sentrux) scans project structure, enforces `.sentrux/rules.toml`, and compares sessions with **gate** baselines. In **Pi**, use the **`sentrux` binary and bash** — Pi does **not** load `.pi/mcp.json`, so Sentrux MCP tools are unavailable in Pi agent sessions.

## Install (once per machine)

| Platform | Command |
|----------|---------|
| macOS | `brew install sentrux/tap/sentrux` |
| Linux | `curl -fsSL https://raw.githubusercontent.com/sentrux/sentrux/main/install.sh \| sh` |

Verify:

```bash
command -v sentrux && sentrux --version
```

Harness setup also checks via `bash "$UP_PKG/.pi/scripts/harness-cli-verify.sh"` (resolve `UP_PKG` in `.pi/scripts/README.md`).

Optional language plugins (52 tree-sitter parsers):

```bash
sentrux plugin add-standard
```

## Core workflows (project root)

Run from the **target repo root** (where `.sentrux/rules.toml` lives), or prefer the bundled wrapper when invoked by harness commands from run directories.

| When | Command | Notes |
|------|---------|-------|
| CI / pre-commit | `node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" check` | Exit 0 = pass, 1 = violations |
| Before agent work | `node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" gate --save` | Save session baseline |
| After agent work | `node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" gate` | Detect degradation vs baseline |
| Harness run/review capture | `harness-sentrux-report.mjs` + `harness-sentrux-diagnostics.mjs` | Single scan → JSON artifacts |
| Explore structure | `sentrux` or `sentrux .` | GUI treemap (optional) |

Typical agent loop:

```bash
node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" gate --save
# … agent edits …
node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" check  # rules still pass?
node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" gate   # structural regression?
```

If `check` fails, fix violations or tune manifest constraints (see **Rules** below). If `gate` reports degradation, inspect changed modules before merging.

## Rules (`.sentrux/rules.toml`)

Committed rules file at repo root. Harness projects sync it from `.pi/harness/sentrux/architecture.manifest.json`.

| Task | Skill / command |
|------|-----------------|
| First bootstrap, manifest → rules | **harness-sentrux-setup** — `node "$UP_PKG/.pi/scripts/harness-sentrux-bootstrap.mjs"` |
| Manifest edited | bootstrap `--force` or `/harness-sentrux-sync` |
| CI drift only | `node "$UP_PKG/.pi/scripts/sentrux-rules-sync.mjs" --check` |

Custom TOML outside `# --- harness:managed:start/end ---` is preserved on sync. Do **not** hand-edit managed blocks without updating the manifest.

## Harness integration

| Piece | Role |
|-------|------|
| `sentrux-rules-sync` extension | Session start: warns if `rules.toml` drifts; auto-sync after plan/merge phases |
| `/harness-sentrux-sync` | Force-regenerate rules from manifest (pi command) |
| `harness-verify.mjs` | Runs rules sync and Sentrux checks when rules are present |
| **observation-bus** | Maps `harness-sentrux-signal` custom entries → evaluator observations |
| **harness-sentrux-repair** skill | Report/diagnostics scripts + `sentrux-repair-advisor` + repair plan artifact |
| **harness-eval** | Evaluate phase may require a Sentrux quality signal before promotion |

High level: **execute** runs one capture (`sentrux-report.json`, `sentrux-diagnostics.json`, signal v1.1.0); **review** may spawn **sentrux-repair-advisor** (Phase 1b); **steer** merges repair plan into `repair-brief.yaml`. No Sentrux Pro or MCP in Pi sessions.

## Related skills

- **harness-sentrux-setup** — manifest seeding, rules bootstrap, sync semantics (do not duplicate here)
- **harness-eval** — verdict + Sentrux signal requirements
- **harness-governor** — when to re-sync after architecture changes

## Do not

- Assume Sentrux **MCP** tools (`scan`, `session_start`, `health`, etc.) exist in **Pi** — they do not; use CLI only
- Edit or rely on `.pi/mcp.json` for Pi sessions
- Duplicate bootstrap/sync steps from **harness-sentrux-setup**
- Skip the root-resolving Sentrux check after large refactors when `.sentrux/rules.toml` exists

## References

- Quality gate policy: require a structural signal for evaluate/promotion decisions when configured.
- Rules lifecycle policy: manifest is source of truth; sync rules from manifest after approved intent changes.
- `CONTRIBUTING.md` — Sentrux quick start
