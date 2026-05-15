# Harness CLI scripts

These scripts ship inside the `ultimate-pi` npm package under `.pi/scripts/`.

Pi's package manifest (`package.json` → `pi`) only loads **extensions**, **skills**, **prompts**, and **themes** — there is no `scripts` field. Harness scripts are invoked via:

- `npm run harness:*` (see root `package.json`)
- Extensions resolving paths with `resolveHarnessScript()` in `.pi/extensions/lib/harness-paths.ts`

| Script | npm script |
|--------|------------|
| `harness-graphify-bootstrap.sh` | `harness:graphify-bootstrap` |
| `harness-cli-verify.sh` | `harness:cli-verify` |
| `harness-verify.mjs` | `harness:verify` |
| `sentrux-rules-sync.mjs` | `harness:sentrux-sync` |

Repo-root `scripts/` (e.g. `regen_graphify_html.py`) is dev-only and excluded from the npm tarball via `.npmignore`.
