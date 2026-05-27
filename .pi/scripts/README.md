# Harness CLI scripts

These scripts ship inside the `ultimate-pi` npm package under `.pi/scripts/`.

Pi's package manifest (`package.json` → `pi`) only loads **extensions**, **skills**, **prompts**, and **themes** — there is no `scripts` field. **Do not rely on npm `harness:*` scripts** in the consuming project's `package.json`; external repos that install `ultimate-pi` may not define them.

## Resolve `ultimate-pi` package root (`UP_PKG`)

**Consumer repo** (`ultimate-pi` in `node_modules`):

```bash
UP_PKG="$(node -p "require('path').dirname(require.resolve('ultimate-pi/package.json'))")"
```

**Developing this repo** (clone of `ultimate-pi`): from the repo root, `UP_PKG="$(pwd)"` (or the same `require.resolve` after `npm install`).

From **Typescript extensions**, use `resolveHarnessScript()` / `getHarnessPackageRoot()` in `.pi/lib/harness-paths.ts`.

## Invocations (from the consuming project root)

| Action | Command |
|--------|---------|
| Graphify bootstrap | `bash "$UP_PKG/.pi/scripts/harness-graphify-bootstrap.sh"` |
| CocoIndex Code bootstrap | `bash "$UP_PKG/.pi/scripts/harness-cocoindex-bootstrap.sh"` |
| CLI tool install + smoke tests | `bash "$UP_PKG/.pi/scripts/harness-cli-verify.sh"` |
| Deterministic harness checks | `node "$UP_PKG/.pi/scripts/harness-verify.mjs"` |
| Sentrux rules bootstrap (harness-setup) | `node "$UP_PKG/.pi/scripts/harness-sentrux-bootstrap.mjs"` |
| Sentrux rules re-sync after manifest edit | `node "$UP_PKG/.pi/scripts/harness-sentrux-bootstrap.mjs" --force` or `/harness-sentrux-sync` |
| Sentrux rules drift check (CI) | `node "$UP_PKG/.pi/scripts/sentrux-rules-sync.mjs" --check` |
| Sentrux run/review check or gate (root-resolving) | `node "$UP_PKG/.pi/scripts/harness-sentrux-cli.mjs" check` / `gate [--save]` |
| Sentrux single-scan report + signal (ADR 0052) | `node "$UP_PKG/.pi/scripts/harness-sentrux-report.mjs" --out <run_dir> --run-id <id> --signal` |
| Sentrux diagnostics synthesis | `node "$UP_PKG/.pi/scripts/harness-sentrux-diagnostics.mjs" --report <run_dir>/artifacts/sentrux-report.json --out <run_dir> [--churn]` |
| ls-lint naming bootstrap (harness-setup) | `node "$UP_PKG/.pi/scripts/harness-ls-lint-bootstrap.mjs"` |
| ls-lint naming re-sync after manifest edit | `node "$UP_PKG/.pi/scripts/harness-ls-lint-bootstrap.mjs" --force` or `/harness-ls-lint-sync` |
| ls-lint config drift check (CI) | `node "$UP_PKG/.pi/scripts/ls-lint-rules-sync.mjs" --check` |
| ls-lint filename check (root-resolving) | `node "$UP_PKG/.pi/scripts/harness-ls-lint-cli.mjs` [`--json`] |
| Resolve package root (`UP_PKG`) | `node "$UP_PKG/.pi/scripts/harness-resolve-up-pkg.mjs"` |
| Project `.env` (append-only) | `node "$UP_PKG/.pi/scripts/harness-sync-env.mjs"` (`--create-missing` after user confirms) |
| Harness lens extension | `.pi/extensions/harness-lens.ts` → `.pi/lib/harness-lens/index.ts` (loaded by `.pi/extensions`; PostHog owns lens telemetry) |

Pass `--force` to shell scripts that support it (e.g. `harness-graphify-bootstrap.sh --force`, `harness-cli-verify.sh --force`).

Repo-root `scripts/` (e.g. `regen_graphify_html.py`) is dev-only and excluded from the npm tarball via `.npmignore`.
