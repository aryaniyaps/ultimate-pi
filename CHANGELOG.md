# Changelog

All notable changes to this project are documented in this file.

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
