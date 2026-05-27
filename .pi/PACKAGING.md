# Pi package packaging (ultimate-pi)

Aligned with [pi packages](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md).

## Pi manifest (`package.json` → `pi`)

| Key | Paths | Notes |
|-----|-------|--------|
| `extensions` | `.pi/extensions` | TypeScript extensions loaded by pi, including the harness lens wrapper |
| `skills` | `.agents/skills`, `.pi/skills` | Agent Skills + pi-local skills |
| `prompts` | `.pi/prompts` | Slash-command prompt templates |

### Slash autocomplete

- **Prompt templates** (`.pi/prompts/*.md`): YAML `description` + optional `argument-hint` per [Pi prompt-templates](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/prompt-templates.md). Filename → `/command` (e.g. `harness-plan.md` → `/harness-plan`). `release.md` is dev-only and excluded from npm `files`.
- **Extension commands** (`.pi/extensions/*.ts`): `pi.registerCommand({ description, getArgumentCompletions? })` for dynamic args (run IDs, `--strict`, etc.). Shared helpers: `.pi/lib/harness-slash-completions.ts`.
- **Contract:** `node "$UP_PKG/.pi/scripts/harness-verify.mjs"` validates shipped prompt frontmatter.

Pi does **not** define `scripts`, `agents`, or `providers` in the manifest.

- **Harness scripts** → `.pi/scripts/` — run via `node` / `bash` and `$UP_PKG` (see `.pi/scripts/README.md`); do not require npm script aliases in consumer `package.json`
- **Subagent agents** → `.pi/agents/**/*.md` (loaded by `@tintinweb/pi-subagents` from the **project** `.pi/agents/`; `/harness-setup` seeds them from the installed package)
- **Providers** → install via `bundledDependencies` + user settings, not a separate manifest directory

## npm `files` allowlist

We use an explicit allowlist (not the whole `.pi/` tree) so dev-only artifacts never ship:

- No `.pi/harness/runs/`, `.pi/harness/.lens/` runtime config/cache, or `firecrawl/.env`
- Ship `.pi/settings.example.json`, not `.pi/settings.json` (dev checkout uses `".."` local package)
- Include **`.pi/lib/harness-lens/`** (harness-native lens: edit autopatch, secrets, deferred format, LSP) — loaded through `.pi/extensions/harness-lens.ts`; findings flow to harness PostHog telemetry
- Include **`vendor/pi-vcc/`** ([`pi-vcc`](https://github.com/sting8k/pi-vcc), MIT; inspired by [lllyasviel/VCC](https://github.com/lllyasviel/VCC)) — loaded via `.pi/extensions/ultimate-pi-vcc.ts`; refresh with `npm run vendor:sync-vcc`
- Include **`vendor/pi-subagents/`** (vendored from [narumiruna/pi-extensions](https://github.com/narumiruna/pi-extensions) `pi-subagents`) — loaded via `.pi/extensions/harness-subagents.ts`; refresh with `npm run vendor:sync-subagents`

## Settings

| File | Shipped | Purpose |
|------|---------|---------|
| `.pi/settings.json` | No | Repo dev only (`"packages": ["..", …]`) |
| `.pi/settings.example.json` | Yes | Merge into project `.pi/settings.json` during setup |

## Dependencies

Runtime pi extensions are regular `dependencies` (installed by `npm install` when pi installs the package). We do **not** use `bundledDependencies`: bundling pre-installs `node_modules` and breaks `npm install -g` / `pi update` for native modules such as `koffi` (empty stub dir, postinstall fails).

`@earendil-works/pi-coding-agent` (and sibling `@earendil-works/pi-ai`, `pi-tui`, `pi-agent-core` used by bundled extensions and vendored integrations) are provided by the Pi install / hoisted from the peer; ultimate-pi lists the latter three as `devDependencies` for `npm run check:ts`.
