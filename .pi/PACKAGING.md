# Pi package packaging (ultimate-pi)

Aligned with [pi packages](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md).

## Pi manifest (`package.json` → `pi`)

| Key | Paths | Notes |
|-----|-------|--------|
| `extensions` | `.pi/extensions` | TypeScript extensions (loaded by pi) |
| `skills` | `.agents/skills`, `.pi/skills` | Agent Skills + pi-local skills |
| `prompts` | `.pi/prompts` | Slash-command prompt templates |

Pi does **not** define `scripts`, `agents`, or `providers` in the manifest.

- **Harness scripts** → `.pi/scripts/` (npm `harness:*` scripts; see `.pi/scripts/README.md`)
- **Subagent agents** → `.pi/agents/**/*.md` (loaded by `@tintinweb/pi-subagents` from the **project** `.pi/agents/`; `/harness-setup` seeds them from the installed package)
- **Providers** → install via `bundledDependencies` + user settings, not a separate manifest directory

## npm `files` allowlist

We use an explicit allowlist (not the whole `.pi/` tree) so dev-only artifacts never ship:

- No `.pi/harness/runs/`, local `model-router.json`, or `firecrawl/.env`
- Ship `.pi/settings.example.json`, not `.pi/settings.json` (dev checkout uses `".."` local package)

## Settings

| File | Shipped | Purpose |
|------|---------|---------|
| `.pi/settings.json` | No | Repo dev only (`"packages": ["..", …]`) |
| `.pi/settings.example.json` | Yes | Merge into project `.pi/settings.json` during setup |

## Dependencies

Runtime pi extensions are regular `dependencies` (installed by `npm install` when pi installs the package). We do **not** use `bundledDependencies`: bundling pre-installs `node_modules` and breaks `npm install -g` / `pi update` for native modules such as `koffi` (empty stub dir, postinstall fails).

`@mariozechner/pi-coding-agent` is a `peerDependency` (provided by the pi CLI).
