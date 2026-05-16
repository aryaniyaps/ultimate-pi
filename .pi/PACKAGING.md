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
- **Subagent agents** → `.pi/agents/**/*.md` on the installed package (`harness/planner`, `pi-pi/agent-expert`, …) via `harness-subagents.ts`; optional **project overrides** at the same relative path under `.pi/agents/`. Version drift: `.pi/harness/agents.manifest.json` (regenerate with `harness-agents-manifest.mjs --write`)
- **Providers** → install via `bundledDependencies` + user settings, not a separate manifest directory

## npm `files` allowlist

We use an explicit allowlist (not the whole `.pi/` tree) so dev-only artifacts never ship:

- No `.pi/harness/runs/`, local `model-router.json`, or `firecrawl/.env`
- Ship `.pi/settings.example.json`, not `.pi/settings.json` (dev checkout uses `".."` local package)
- Include **`vendor/pi-model-router/`** ([`pi-model-router`](https://github.com/yeliu84/pi-model-router), MIT) — see repo [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md); refresh with `npm run vendor:sync-router`

## Settings

| File | Shipped | Purpose |
|------|---------|---------|
| `.pi/settings.json` | No | Repo dev only (`"packages": ["..", …]`) |
| `.pi/settings.example.json` | Yes | Merge into project `.pi/settings.json` during setup |

## Dependencies

Runtime pi extensions are regular `dependencies` (installed by `npm install` when pi installs the package). We do **not** use `bundledDependencies`: bundling pre-installs `node_modules` and breaks `npm install -g` / `pi update` for native modules such as `koffi` (empty stub dir, postinstall fails).

`@mariozechner/pi-coding-agent` (and sibling `@mariozechner/pi-ai`, `pi-tui`, `pi-agent-core` used by the vendored router) are provided by the Pi install / hoisted from the peer; ultimate-pi lists the latter three as `devDependencies` for `npm run check:ts`.
