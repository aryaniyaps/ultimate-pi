![Ultimate PI banner](https://raw.githubusercontent.com/aryaniyaps/ultimate-pi/main/.github/banner-v2.png)

> (Beta) The **ultimate AI coding harness** on top of [**pi.dev**](https://pi.dev).

## Goal

Ship a production-grade coding harness where the agent:
1. uses compressed context before raw tool spam,
2. stays concise and deterministic in output style,
3. remains easy to extend with skills and extensions.

## Getting started

1. Install from npm:

   ```bash
   npm install -g ultimate-pi
   ```

2. Install package into PI from your project folder:

   ```bash
   pi install ultimate-pi -l
   ```

3. Reload PI to activate skills and extensions:

   ```bash
   /reload
   ```

4. Optional: install from GitHub Packages instead:

   ```bash
   npm install -g @aryaniyaps/ultimate-pi --registry=https://npm.pkg.github.com
   ```

## Obsidian wiki setup

### Step 1 — Run `wiki`

Inside your PI session, run:

```
/wiki
```

This skill walks you through the rest automatically — creating the folder structure, special files (`Home.md`, `log.md`, `hot.md`), `.gitignore`, and `.obsidian` config. It stays in sync with the skill definition, so you always get the latest structure without manually mirroring docs here.

### Step 2 — Open in Obsidian

1. Open Obsidian → **File → Open Vault** → select your vault directory (e.g. `~/wiki/ultimate-pi`)
2. Install recommended community plugins:
   - **Dataview** — query page metadata, dynamic tables
   - **Graph Analysis** — enhanced graph view
   - **Obsidian Git** — auto-commit and push vault to the wiki repo

### Start using wiki skills

```
/wiki-status          → see what sources are available to ingest
/wiki-ingest          → add your first sources
/wiki-query           → ask questions across your wiki
/wiki-lint            → check wiki health
/wiki-update          → sync current project knowledge into the wiki
```

## Included skills

### Core skills (upstream repositories)

| Skill | Upstream | What it does |
|---|---|---|
| caveman | [juliusbrussee/caveman](https://github.com/juliusbrussee/caveman) | Ultra-compressed response style. Cuts token usage ~75%. |
| compress | [juliusbrussee/caveman](https://github.com/juliusbrussee/caveman) | Compress memory/context files into caveman format. |
| lean-ctx | [yvgude/lean-ctx](https://github.com/yvgude/lean-ctx) | Context runtime — 46 MCP tools, 10 read modes, tree-sitter AST. Compresses context up to 99%. |
| context7-cli | [upstash/context7](https://github.com/upstash/context7) | Fetch current library docs, manage Context7 skills/config. |
| scrapling-official | [D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling) | Web scraping with anti-bot bypass, JS rendering, stealth fetchers. |

### Obsidian wiki skills (11 skills)

Installed via `npx skills add AgriciDaniel/claude-obsidian --yes` or bundled:

| Skill | What it does |
|---|---|
| autoresearch | Research topic and file to wiki. |
| canvas | Work with JSON canvas. |
| obsidian-bases | Create database-like views. |
| obsidian-markdown | Edit Obsidian flavored markdown. |
| save | Save conversation to wiki. |
| wiki | Add links to orphan files. |
| wiki-fold | Create index files for folders. |
| wiki-ingest | Distill sources to wiki. |
| wiki-lint | Check for broken links/orphans. |
| wiki-query | Answer questions via wiki search. |
| defuddle | Extract clean markdown from web pages, stripping clutter. |

### Runtime guardrail extension

- `extensions/lean-ctx-enforce.ts`
  - Detects `lean-ctx` availability (cached check).
  - Overrides built-in `read` tool to execute through `lean-ctx read` when available.
  - Overrides built-in `bash` tool and auto-wraps commands with `lean-ctx -c <command>` when needed.
  - Falls back to default built-in tools if `lean-ctx` is unavailable.
  - Adds status command:
    - `/lean-ctx-status`

### Dotenv loader extension

- `extensions/dotenv-loader.ts`
  - Loads `.env` files into `process.env` on session start, before other extensions read their config.
  - Ensures extensions like `@posthog/pi` can pick up env vars from `.env` automatically.
  - Configurable via env vars (set before launching pi):

| Variable | Default | Description |
|---|---|---|
| `ENV_LOADER_FILES` | `.env` | Comma-separated list of `.env` file paths (relative to cwd). |
| `ENV_LOADER_OVERRIDE` | `false` | Set to `true` to overwrite existing env vars. |
| `ENV_LOADER_SILENT` | `false` | Set to `true` to suppress startup logs. |
| `ENV_LOADER_ENCODING` | `utf-8` | File encoding for `.env` files. |

  - Supports variable expansion (`$VAR` and `${VAR}`) referencing current `process.env`.
  - Reloads on `/reload`.
  - Status command: `/env-loader-status`

### PostHog analytics extension

- `@posthog/pi` (installed via `pi install @posthog/pi`)
  - Wraps the upstream [posthog-pi](https://github.com/PostHog/posthog-pi) extension to capture AI generation spans, tool spans, and traces in [PostHog](https://posthog.com). See the upstream repo for configuration and env vars.

## Design choices (concise)

1. **Lean-ctx-first execution**  
   Reason: cut context/token waste and keep tool usage structured.

2. **Caveman-by-default response style**  
   Reason: short, exact, low-noise outputs for coding loops.

3. **Runtime enforcement in extension code**  
   Reason: executable extension logic is the single source of truth for lean-ctx routing.

4. **Skill-based composition**  
   Reason: easy to swap/upgrade capabilities without rewiring core package.

5. **Model-agnostic compression path**  
   Reason: `compress` skill calls PI CLI, so provider/model can change per environment.

## Development setup

1. Clone and install dependencies:

   ```bash
   git clone https://github.com/aryaniyaps/ultimate-pi.git
   cd ultimate-pi
   npm install
   ```

   `npm install` automatically sets up pre-commit hooks via [Lefthook](https://github.com/evilmartians/lefthook).

2. Install the package locally into PI:

   ```bash
   pi install . -l
   ```

   Then restart PI or run `/reload`.

### Linting & formatting

This project uses [Biome](https://biomejs.dev) for linting, formatting, and import sorting.

```bash
npm run lint            # check lint + format errors
npm run lint:fix        # auto-fix lint + format errors
npm run format          # format all files
npm run format:check    # check formatting without writing
npm run check:ts        # typecheck extensions
```

Pre-commit hooks run `biome check` and `tsc` on staged files automatically — no bad code gets committed.

## Terminal-Bench evaluation (local only)

Use Harbor custom-agent flow from docs:

```bash
npm run bench:terminal
```

Scaffold files live in `bench/terminal-bench/` and are excluded from npm publish via `.npmignore`.