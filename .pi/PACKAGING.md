# Pi package packaging (ultimate-pi)

Aligned with [pi packages](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md).

## Pi manifest (`package.json` → `pi`)

| Key | Paths | Notes |
|-----|-------|--------|
| `extensions` | `.pi/extensions` | TypeScript extensions (loaded by pi) |
| `skills` | `.agents/skills`, `.pi/skills` | Agent Skills + pi-local skills |
| `prompts` | `.pi/prompts` | Slash-command prompt templates |

Pi does **not** define `scripts`, `agents`, or `providers` in the manifest.

- **Harness scripts** → `.pi/scripts/` — run via `node` / `bash` and `$UP_PKG` (see `.pi/scripts/README.md`); do not require npm script aliases in consumer `package.json`
- **Subagent agents** → `.pi/agents/**/*.md` (loaded by `@tintinweb/pi-subagents` from the **project** `.pi/agents/`; `/harness-setup` seeds them from the installed package)
- **Providers** → install via `bundledDependencies` + user settings, not a separate manifest directory

## npm `files` allowlist

We use an explicit allowlist (not the whole `.pi/` tree) so dev-only artifacts never ship:

- No `.pi/harness/runs/`, local `model-router.json`, or `firecrawl/.env`
- Ship `.pi/settings.example.json`, not `.pi/settings.json` (dev checkout uses `".."` local package)
- Include **`vendor/pi-model-router/`** ([`pi-model-router`](https://github.com/yeliu84/pi-model-router), MIT) — see repo [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md); refresh with `npm run vendor:sync-router`
- Include **`vendor/pi-vcc/`** ([`pi-vcc`](https://github.com/sting8k/pi-vcc), MIT; inspired by [lllyasviel/VCC](https://github.com/lllyasviel/VCC)) — loaded via `.pi/extensions/ultimate-pi-vcc.ts`; refresh with `npm run vendor:sync-vcc`

## Settings

| File | Shipped | Purpose |
|------|---------|---------|
| `.pi/settings.json` | No | Repo dev only (`"packages": ["..", …]`) |
| `.pi/settings.example.json` | Yes | Merge into project `.pi/settings.json` during setup |

## Dependencies

Runtime pi extensions are regular `dependencies` (installed by `npm install` when pi installs the package). We do **not** use `bundledDependencies`: bundling pre-installs `node_modules` and breaks `npm install -g` / `pi update` for native modules such as `koffi` (empty stub dir, postinstall fails).

`@earendil-works/pi-coding-agent` (and sibling `@earendil-works/pi-ai`, `pi-tui`, `pi-agent-core` used by the vendored router) are provided by the Pi install / hoisted from the peer; ultimate-pi lists the latter three as `devDependencies` for `npm run check:ts`.
