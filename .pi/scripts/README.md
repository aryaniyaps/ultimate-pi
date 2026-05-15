# Harness CLI scripts

These scripts ship inside the `ultimate-pi` npm package under `.pi/scripts/`.

Pi's package manifest (`package.json` → `pi`) only loads **extensions**, **skills**, **prompts**, and **themes** — there is no `scripts` field. **Do not rely on npm `harness:*` scripts** in the consuming project's `package.json`; external repos that install `ultimate-pi` may not define them.

## Resolve `ultimate-pi` package root (`UP_PKG`)

**Consumer repo** (`ultimate-pi` in `node_modules`):

```bash
UP_PKG="$(node -p "require('path').dirname(require.resolve('ultimate-pi/package.json'))")"
```

**Developing this repo** (clone of `ultimate-pi`): from the repo root, `UP_PKG="$(pwd)"` (or the same `require.resolve` after `npm install`).

From **Typescript extensions**, use `resolveHarnessScript()` / `getHarnessPackageRoot()` in `.pi/extensions/lib/harness-paths.ts`.

## Invocations (from the consuming project root)

| Action | Command |
|--------|---------|
| Graphify bootstrap | `bash "$UP_PKG/.pi/scripts/harness-graphify-bootstrap.sh"` |
| CLI tool install + smoke tests | `bash "$UP_PKG/.pi/scripts/harness-cli-verify.sh"` |
| Deterministic harness checks | `node "$UP_PKG/.pi/scripts/harness-verify.mjs"` |
| Sentrux rules from manifest | `node "$UP_PKG/.pi/scripts/sentrux-rules-sync.mjs" --force` |
| Model-router / Pi defaults | `harness-sync-model-router.mjs` (Step 3.5 of `/harness-setup`) |
| Vendor router sync (this repo only) | `bash .pi/scripts/vendor-sync-pi-model-router.sh` or `npm run vendor:sync-router` |
| Meta-optimizer (JSONL proposals) | `node "$UP_PKG/.pi/harness/evolution/meta-optimizer.mjs"` |

Pass `--force` to shell scripts that support it (e.g. `harness-graphify-bootstrap.sh --force`, `harness-cli-verify.sh --force`).

Repo-root `scripts/` (e.g. `regen_graphify_html.py`) is dev-only and excluded from the npm tarball via `.npmignore`.
