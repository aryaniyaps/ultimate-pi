# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

## [v0.7.0] — 2026-05-17

### ✨ Features

- **Harness run context:** track active run and canonical plan path in session; short slash commands without `--run` or `--plan`; project `active-run.json` for forked eval sessions; ADR 0031.
- **System prompt extension:** load packaged `.pi/SYSTEM.md` by default with optional workspace `.pi/system.md` override.

### 📖 Documentation

- **README and harness prompts:** manual workflow without run IDs; `harness-run-status`, `harness-new-run`, `harness-use-run` helpers.

### 🔧 Chores

- **harness-setup:** remove Sentrux skill symlink step; rules bootstrap only.

## [v0.6.1] — 2026-05-17

### 🐛 Fixes

- **SearXNG bootstrap:** generate `SEARXNG_SECRET` and set `server.secret_key` so containers no longer crash on the default `ultrasecretkey` (SearXNG 2026.4+).
- **Harness env template:** remove obsolete `PI_VCC_CONFIG_PATH`; add env-only VCC, PostHog MCP, Sentrux, and default `VAULT_WIKI_PATH` keys aligned with `/harness-setup`.

## [v0.6.0] — 2026-05-17

### ✨ Features

- **sentrux Pi skill:** CLI-first architectural quality workflows (`check`, `gate`, GUI) via `/skill:sentrux`; symlinked in `.pi/skills`. Pi does not load `.pi/mcp.json`.

### 📖 Documentation

- **harness-setup / CONTRIBUTING:** document Sentrux skill instead of MCP config; update `harness-sentrux-setup` workflow.

### 🔧 Chores

- Remove shipped `.pi/mcp.json` from package `files` list; refresh `graphify-out`.

## [v0.5.0] — 2026-05-17

### ✨ Features

- **web_search / web_fetch pi tools:** wrap `harness-web.py` with session injection and a bash guard so agents skip `UP_PKG` and scrapling import preflights.
- **SearXNG search backend:** pluggable `HARNESS_WEB_SEARCH_ENGINE` (`ddg_html` | `searxng`) with Docker bootstrap via `harness-searxng-bootstrap.mjs`.
- **harness-web status:** JSON config subcommand for setup and diagnostics.

### 🔧 Chores

- Apply pre-commit format and refresh `graphify-out` after harness-web tools merge.

## [v0.4.1] — 2026-05-17

### ✨ Features

- **In-house VCC compaction:** vendored [pi-vcc](https://github.com/sting8k/pi-vcc) (inspired by [lllyasviel/VCC](https://github.com/lllyasviel/VCC)); removed `@sting8k/pi-vcc` npm dependency. Configuration is **env-only** (`HARNESS_VCC_COMPACTION`, `HARNESS_VCC_DEBUG`) — no `PI_VCC_CONFIG_PATH` or JSON config files. VCC overrides `/compact` and auto-compaction by default; set `HARNESS_VCC_COMPACTION=false` for Pi LLM compaction. Refresh upstream: `npm run vendor:sync-vcc`.
- **Harness subagents:** vendored harness-subagents extension with Sentrux bootstrap agent and related harness wiring.
- **Harness web:** replace Firecrawl with Scrapling-based `harness-web` CLI for search and fetch.

### 🔧 Chores

- Format `.pi/settings.json` / `.pi/settings.example.json` and refresh `graphify-out` after VCC merge.

## [v0.3.1] — 2026-05-15

### 🐛 Fixes

- **External `/harness-setup`**: policy gate no longer forces **plan** phase because the setup doc mentions `harness-plan` (e.g. `gh label create "harness-plan"`).
- **Harness specs in consumer repos**: copy `*.schema.json` and specs `README` from the package via `harness-seed-project-contracts.mjs` as part of setup (so `plan-packet.schema.json` exists before planning).
- **Strict LLM gateways**: new `provider-payload-sanitize` extension removes disallowed top-level fields (`reasoning`, etc.) from `messages` before provider requests (avoids 400 “Extra inputs … reasoning” on some OpenAI-compatible APIs).

## [v0.3.0] — 2026-05-15

### 📦 Release

- First tag-driven npm / GitHub Packages publish since **v0.2.2**; intermediate history remains under **v0.2.3–v0.2.10** below.

### ✨ Features

- Vendored [**pi-model-router**](https://github.com/yeliu84/pi-model-router) with harness gate and `npm run vendor:sync-router`
- Sentrux **`rules.toml`** sync from `architecture.manifest.json` plus Phase 2 harness telemetry / governance scaffolding (see ADRs)
- Document **`UP_PKG`** resolution and direct **`$UP_PKG/.pi/scripts/*`** invocation for external installs (no `harness:*` entries in consumer `package.json`)

### 🐛 Fixes

- **`pi update`** / global installs: complete `koffi` tree; Node 22–compatible dependency graph
- Harness-setup: Graphify bootstrap + CLI verification improvements (system deps, installers)

### 🔧 Chores

- Drop external **`npm:@yeliu84/pi-model-router`** dependency; add **`THIRD_PARTY_NOTICES.md`**
- Align publish **`files`** allowlist and **graphify-out** refresh

## [v0.2.10] — 2026-05-15

### 🔧 Chores

- Harness scripts must be invoked from `.pi/scripts/` (or `$UP_PKG/.pi/scripts/` for consumers); root `npm run harness:*` scripts removed so `pi install npm:ultimate-pi` works in external repos without mirroring npm script entries


### ✨ Features

- Vendor [`yeliu84/pi-model-router`](https://github.com/yeliu84/pi-model-router) under `vendor/pi-model-router/` with a harness gate in `.pi/extensions/pi-model-router-harness.ts` (no `router/auto` until `.pi/model-router.json` exists after `/harness-setup`)
- `npm run vendor:sync-router` to refresh upstream + apply import patches (see `vendor/pi-model-router/UPSTREAM_PIN.md`)

### 🔧 Chores

- Remove `npm:@yeliu84/pi-model-router` from package dependencies; add `THIRD_PARTY_NOTICES.md`
- `harness-sync-model-router.mjs` adjusts Pi defaults only (no package toggling)
- `check:ts` uses ES2023; devDependency on `@mariozechner/pi-ai`, `pi-tui`, `pi-agent-core` for vendored typecheck

### 🐛 Fixes

- Avoid npm package conflicts — router always comes from the bundled vendor tree

## [v0.2.8] — 2026-05-15

### ✨ Features

- Gate `pi-model-router`: shipped `.pi/settings.example.json` no longer lists `npm:@yeliu84/pi-model-router` until `/harness-setup` Step 3.5 creates `.pi/model-router.json` and runs `harness-sync-model-router.mjs` (adds the package, sets `router` / `auto` when project `defaultProvider` is unset, strips stale router entries when config is missing)

### 🐛 Fixes

- Remove extension bootstrap that auto-wrote `.pi/model-router.json` on every start (router config is harness-owned only; avoids `router/auto` + built-in `gpt-5.4-pro` before setup)

## [v0.2.7] — 2026-05-15

### 🐛 Fixes

- Remove `bundledDependencies` so `pi update` / `npm install -g ultimate-pi` installs a complete `koffi` tree (fixes empty `node_modules/koffi` and postinstall failure)
- Drop `context-mode` from package `dependencies` (install via `npm:context-mode` in project settings; avoids Node &lt; 22.5 postinstall failure on global update)

## [v0.2.6] — 2026-05-15

### 🔧 Chores

- Align npm publish with pi package docs: explicit `files` allowlist (no dev runs, secrets, or local router config)
- Fix `pi` manifest: drop missing `.pi/providers`, add `.pi/skills`
- Ship `.pi/settings.example.json` instead of dev `.pi/settings.json` (removes `".."` local package from installs)
- Document layout in `.pi/PACKAGING.md`; harness-setup seeds `.pi/agents` and resolves package root for npm installs

## [v0.2.5] — 2026-05-15

### 🔧 Chores

- Move harness CLI scripts to `.pi/scripts/` (aligned with pi package layout; no `pi.scripts` manifest field)
- Point `npm run harness:*` and sentrux manifest at `.pi/scripts/`
- Exclude repo-root `scripts/` from npm publish (dev-only graphify helpers stay in checkout)

## [v0.2.4] — 2026-05-15

### 🐛 Fixes

- Stop forcing `router/auto` on install (avoids defaulting to `gpt-5.4-pro` when no `.pi/model-router.json`)
- Bootstrap `model-router.json` from detected providers when missing
- Load banner and sentrux sync script from the npm package root, not the host project's cwd
- Remove redundant `firecrawl setup skills` from harness-setup (skills ship with the package)

### 📖 Documentation

- Add `.pi/model-router.example.json` and README note on opt-in model routing

## [v0.2.3] — 2026-05-15

### ✨ Features

- Sync `.sentrux/rules.toml` from `.pi/harness/sentrux/architecture.manifest.json` on harness setup and plan/merge
- Add `sentrux-rules-sync` pi extension and `npm run harness:sentrux-sync`
- Extend `harness:verify` to require rules.toml in sync with the manifest

### 📖 Documentation

- ADR 0009 (Sentrux rules lifecycle) and README/harness-setup updates

## [v0.2.2] — 2026-05-15

### 🔧 Chores

- trim npm bundle and declare bundled deps
- refresh generated artifacts

## [v0.2.1] — 2026-05-15

### 🐛 Fixes

- default to flow mode and soften budget gates

### 🔧 Chores

- sync generated report and graph artifacts
- refresh rebuild lock metadata
- update install instructions and refresh graph artifacts

## [v0.2.0] — 2026-05-15

### ✨ Features

- update extension banner and custom header
- add abort flow and safer live widget rendering
- add orchestration stack and banner compatibility
- router-aware custom footer with profile colors
- gitignore model-router.json and generate dynamically from env
- merge books & YT corpora, add merge scripts, up viz cap to 200K
- add research papers and graphify knowledge graph outputs
- add skill and rebuild knowledge graph
- ingest Gleeson Musk first-principles prompts thread
- add books corpus knowledge graph with cross-book linking
- integrate ast-grep as primary code search tool
- add sentrux architectural quality gate integration

### 🐛 Fixes

- consolidate outputs into graphify-out/, prevent root duplication
- add --ignore-scripts to npm publish in GitHub Packages workflow

### ♻️ Refactoring

- migrate from Obsidian wiki to Graphify knowledge graph

### 📖 Documentation

- add beginner-friendly harness user guide
- label all 428 communities, regenerate report and HTML

### 🎨 Style

- apply linter formatting (tab indent)

### 🔧 Chores

- refresh generated graph artifacts
- align graphify skill source to project-local path
- include latest post-commit graph rebuild outputs
- refresh generated graph and harness run artifacts
- remove redundant internal code
- refresh generated graph artifacts
- remove rethink agent, add youtube video catalog
- index NEA × Namespace CI/CD / continuous compute YouTube talk
- remove graphify-books-corpus aigleeson musk prompts markdown file
- rename data/yt-vid to data/youtube-transcripts
- align graphify outputs with data/books corpus paths
- add data/ corpus: books (Git LFS) and yt-vid transcripts
- add reusable YouTube transcript indexer (yt-dlp + Firecrawl CLI)
- re-format includes array as multi-line
- exclude graphify-books-out/ from lint/format
- accept remote graphify-out artifacts, remove cache/ from tracking (gitignored)
- add graphify-out/cache/ to .gitignore
- update wiki docs
- update wiki docs
- update wiki docs
- update wiki docs
- update wiki docs
- update wiki docs
- update wiki docs
- update wiki docs
- update wiki docs
- update wiki docs
- fix biome ignore pattern: !graphify-out
- ignore graphify-out from biome lint
- update knowledge graph caches after background rebuild
- remove wiki skills superseded by graphify
- remove defuddle-cli and defuddle skill references (firecrawl covers same)

## [v0.1.7] — 2026-05-07

### ✨ Features

- add /release prompt for version bump and CI/CD publish
- integrate pi-vcc for deterministic auto-compaction
- replace pi-lean-ctx with context-mode
- add soundboard extension, update settings and firecrawl env template

### 🔧 Chores

- bump to 0.1.7, move vault AGENTS.md and .vault-meta under VAULT_WIKI_PATH
