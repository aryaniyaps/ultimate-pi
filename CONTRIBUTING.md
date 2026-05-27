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

[Sentrux](https://github.com/sentrux/sentrux) provides real-time structural quality metrics for AI-agent-written code. It acts as a feedback loop sensor — scanning codebase architecture, detecting degradation, and enforcing rules via the CLI.

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

### Pi skill

In Pi sessions, use the **`sentrux`** skill (`/skill:sentrux`) — CLI workflows (`check`, `gate`, GUI), not MCP. Pi does not load `.pi/mcp.json`. For rules bootstrap from the harness manifest, use **harness-sentrux-setup**. For harness run/review capture and repair plans (OSS diagnostics, no Pro), use **harness-sentrux-repair** (ADR 0052).

### Rules Engine

Create `.sentrux/rules.toml` to define architectural constraints:

```toml
[constraints]
max_cycles = 0
max_coupling = "B"
max_cc = 25
no_god_files = true
```

## ls-lint (filename / directory naming)

[ls-lint](https://ls-lint.org/) enforces kebab-case (and path-scoped rules) on file and directory names. The harness keeps `.ls-lint.yml` in sync with `.pi/harness/ls-lint/naming.manifest.json` (see ADR 0052).

```bash
npm install -g @ls-lint/ls-lint@2.3.1
node "$UP_PKG/.pi/scripts/harness-ls-lint-bootstrap.mjs"
ls-lint
```

In Pi sessions, use **harness-ls-lint-setup** for bootstrap vs steward vs sync. Re-sync after manifest edits: `/harness-ls-lint-sync` or `node "$UP_PKG/.pi/scripts/ls-lint-rules-sync.mjs" --force`.

## harness-web (Scrapling)

Harness agents fetch the web through `python3 "$UP_PKG/.pi/scripts/harness-web.py"` (Scrapling). No Docker compose stack or paid API keys.

### Quick start

```bash
command -v uv &>/dev/null || curl -LsSf https://astral.sh/uv/install.sh | sh
uv tool install "scrapling[fetchers]"
scrapling install
bash "$UP_PKG/.pi/scripts/harness-cli-verify.sh"
```

Artifacts go under `.web/` (gitignored). See `.agents/skills/web-retrieval/SKILL.md`.

### Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `HARNESS_WEB_FETCH_MODE` | `stealth` | `stealth` \| `fast` \| `auto` |
| `HARNESS_WEB_SEARCH_ENGINE` | `ddg_html` | `ddg_html` \| `searxng` |
| `HARNESS_WEB_SEARXNG_URL` | (unset) | Required when `SEARCH_ENGINE=searxng` (e.g. `http://127.0.0.1:8080`) |
| `HARNESS_WEB_PROXY` | (unset) | Optional proxy |
| `HARNESS_WEB_RATE_LIMIT_MS` | `2000` | Bulk scrape delay |
| `HARNESS_WEB_TIMEOUT_MS` | `30000` | Request timeout |

Cursor’s optional Firecrawl editor plugin is separate — harness agents must use harness-web to avoid split brain.

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

### Harness governance extensions

These Pi extensions are loaded from `.pi/extensions/` via the root `package.json`
`pi.extensions` manifest (no extra registration needed):

- `.pi/extensions/policy-gate.ts` — plan-before-mutate + phase enforcement
- `.pi/extensions/budget-guard.ts` — budget hard-stop and `budget_exhausted` events
- `.pi/extensions/trace-recorder.ts` — run trace artifacts in `.pi/harness/runs/`
- `.pi/extensions/review-integrity.ts` — evaluator/adversary session isolation checks
- `.pi/extensions/test-diff-integrity.ts` — suspicious test diff detection/escalation
- `.pi/extensions/debate-orchestrator.ts` — headless debate bus + consensus packets

### PostHog analytics

`@posthog/pi` — wraps the upstream [posthog-pi](https://github.com/PostHog/posthog-pi) extension to capture AI generation spans, tool spans, and traces in [PostHog](https://posthog.com). Install via `pi install @posthog/pi`. See the upstream repo for configuration and env vars.

## Skill sources

| Skill | Upstream |
|---|---|
| context7-cli | [upstash/context7](https://github.com/upstash/context7) |
| find-skills | bundled (context7-compatible discovery) |
| web-retrieval | bundled (WRS + harness-web CLI + Scrapling) |
| obsidian/wiki skills (11 skills) | [AgriciDaniel/claude-obsidian](https://github.com/AgriciDaniel/claude-obsidian) |
| posthog-analyst | bundled (PostHog MCP integration) |

### Wiki sub-skills

`wiki`, `wiki-save`, `wiki-query`, `wiki-ingest`, `wiki-lint`, `wiki-fold`, `autoresearch`, `canvas`, `obsidian-markdown`, `obsidian-bases`

> `context-mode` is installed as a separate pi package (`npm:context-mode`) — not bundled as a skill.
