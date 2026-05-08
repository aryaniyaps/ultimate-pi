# Contributing to ultimate-pi

## Local development setup

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

## Linting & formatting

Uses [Biome](https://biomejs.dev) for linting, formatting, and import sorting.

```bash
npm run lint            # check lint + format errors
npm run lint:fix        # auto-fix lint + format errors
npm run format          # format all files
npm run format:check    # check formatting without writing
npm run check:ts        # typecheck extensions
```

Pre-commit hooks run `biome check` and `tsc` on staged files automatically.

## Sentrux (architectural quality gate)

[Sentrux](https://github.com/sentrux/sentrux) provides real-time structural quality metrics for AI-agent-written code. It acts as a feedback loop sensor — scanning codebase architecture, detecting degradation, and enforcing rules via MCP.

### Quick start

```bash
# Install (macOS / Linux / Windows)
curl -fsSL https://raw.githubusercontent.com/sentrux/sentrux/main/install.sh | sh

# Install all 52 language plugins
sentrux plugin add-standard

# Run a quality scan
sentrux check .

# Save baseline before agent session
sentrux gate --save .

# Compare after — catches degradation
sentrux gate .
```

### MCP Integration

The sentrux MCP server is configured in `.pi/mcp.json`. Agents can use tools like `scan`, `session_start`, `session_end`, `check_rules`, `health`, and `evolution` to monitor code quality during development.

### Rules Engine

Create `.sentrux/rules.toml` to define architectural constraints:

```toml
[constraints]
max_cycles = 0
max_coupling = "B"
max_cc = 25
no_god_files = true
```

## Firecrawl (self-hosted web scraping)

The Firecrawl skill depends on a Firecrawl instance. This repo includes a self-hosted setup powered by Docker.

### Quick start

```bash
cd firecrawl
cp .env.template .env   # first time only — edit if needed
docker compose up -d     # pulls pre-built GHCR images automatically
```

Firecrawl API is now at `http://localhost:3002`. Admin UI at `http://localhost:3002/admin/<BULL_AUTH_KEY>/queues`.

### Services

| Service | Image | Port |
|---------|-------|------|
| `api` | `ghcr.io/firecrawl/firecrawl` | 3002 |
| `playwright-service` | `ghcr.io/firecrawl/playwright-service:latest` | 3000 (internal) |
| `nuq-postgres` | `ghcr.io/firecrawl/nuq-postgres:latest` | 5432 (internal) |
| `redis` | `redis:alpine` | 6379 (internal) |
| `rabbitmq` | `rabbitmq:3-management` | 5672 (internal) |
| `searxng` | `searxng/searxng:latest` | 8080 |

### Configuration

All options live in `firecrawl/.env`. See `firecrawl/.env.template` for the full reference. Key env vars:

- `PORT` — API port (default: `3002`)
- `SEARXNG_ENDPOINT` — enables `/search` API (default: `http://searxng:8080`)
- `OPENAI_API_KEY` — enables AI features (JSON formatting, `/extract` API)
- `BULL_AUTH_KEY` — admin UI access key (default: `CHANGEME` — change in production)

See `firecrawl/README.md` for detailed docs and SDK usage examples.

## Extensions

### Dotenv loader

`.pi/extensions/dotenv-loader.ts` — loads `.env` files into `process.env` on session start.

Configurable via env vars (set before launching pi):

| Variable | Default | Description |
|---|---|---|
| `ENV_LOADER_FILES` | `.env` | Comma-separated list of `.env` file paths (relative to cwd). |
| `ENV_LOADER_OVERRIDE` | `false` | Set to `true` to overwrite existing env vars. |
| `ENV_LOADER_SILENT` | `false` | Set to `true` to suppress startup logs. |
| `ENV_LOADER_ENCODING` | `utf-8` | File encoding for `.env` files. |

- Supports variable expansion (`$VAR` and `${VAR}`).
- Reloads on `/reload`.
- Status command: `/env-loader-status`

### PostHog analytics

`@posthog/pi` — wraps the upstream [posthog-pi](https://github.com/PostHog/posthog-pi) extension to capture AI generation spans, tool spans, and traces in [PostHog](https://posthog.com). Install via `pi install @posthog/pi`. See the upstream repo for configuration and env vars.

## Skill sources

| Skill | Upstream |
|---|---|
| caveman | [juliusbrussee/caveman](https://github.com/juliusbrussee/caveman) |
| context7-cli | [upstash/context7](https://github.com/upstash/context7) |
| find-skills | bundled (context7-compatible discovery) |
| firecrawl (13 skills) | [firecrawl](https://firecrawl.dev) |
| obsidian/wiki skills (11 skills) | [AgriciDaniel/claude-obsidian](https://github.com/AgriciDaniel/claude-obsidian) |
| posthog-analyst | bundled (PostHog MCP integration) |

### Firecrawl sub-skills

`firecrawl-search`, `firecrawl-scrape`, `firecrawl-crawl`, `firecrawl-map`, `firecrawl-download`, `firecrawl-parse`, `firecrawl-interact`, `firecrawl-agent`, `firecrawl-build-scrape`, `firecrawl-build-search`, `firecrawl-build-onboarding`, `firecrawl-build-interact`

### Wiki sub-skills

`wiki`, `wiki-save`, `wiki-query`, `wiki-ingest`, `wiki-lint`, `wiki-fold`, `autoresearch`, `canvas`, `obsidian-markdown`, `obsidian-bases`

> `context-mode` is installed as a separate pi package (`npm:context-mode`) — not bundled as a skill.
