---
description: Full harness bootstrap — Graphify knowledge graph setup, Scrapling/harness-web install, CLI tools, pi extension packages, and verification. Run once per project.
argument-hint: "[--skip-graphify] [--skip-tools] [--non-interactive] [--force]"
---

# harness-setup — Full Harness Bootstrap

Bootstraps the complete ultimate-pi agentic harness: Graphify knowledge graph, CLI tools, pi extension packages, configuration files, and verification. Idempotent — safe to re-run, skips what's already installed.

## Agent execution notes (read first)

**Prefer bundled scripts over re-implementing steps.** Each script is idempotent. Do not duplicate Step 2 subsections (2.1–2.8) when `harness-cli-verify.sh` already passed.

| Pitfall | Correct approach |
|---------|------------------|
| `UP_PKG="$(pwd)"` in an **external** repo | Wrong — scripts live in the npm package. Resolve via `harness-resolve-up-pkg.mjs` (see Step 0). |
| Provider detection from `OPENAI_*` / `ANTHROPIC_*` env only | Wrong for pi users — keys live in `~/.pi/agent/auth.json`. Use `harness-generate-model-router.mjs` (Pi `ModelRegistry.getAvailable()`). |
| Re-running 2.1–2.8 manually after CLI verify | Wasteful — trust `harness-cli-verify.sh` output; only fix reported ✗ lines. |
| Overwriting `AGENTS.md` after graphify | Graphify appends a section — **merge**, do not replace (Step 4.3). |
| `sentrux-rules-sync` without project manifest | Use **`harness-sentrux-bootstrap.mjs`** (Step 4.2) — seeds manifest + idempotent rules sync. |
| Re-running bootstrap with `--force` on unchanged manifest | Wasteful but safe — default bootstrap skips when hash unchanged; `--force` only after manifest edits. |
| `graph.json` uses `links`, not `edges` | Step 6 stats: `g.get('edges', g.get('links', []))`. |
| Guessing harness-web / `.env` defaults when `ask_user` is available | **Mandatory `ask_user`** at Step 4.0 unless `--non-interactive`. |
| `sudo apt-get` without passwordless sudo | Skip — report manual fix; do not block the rest of setup. |
| `graphify codex install` | **Never run** — it writes `.codex/hooks.json`. Harness targets pi only (`graphify install --platform pi`). |
| Overwriting `.env` | Use `harness-sync-env.mjs` — never rewrite; append missing keys only. |

## Parse arguments

Read `$ARGUMENTS` and map flags:

- `--skip-graphify`
- `--skip-tools`
- `--non-interactive`
- `--force`

If a flag is unknown, stop and return:

`Usage: /harness-setup [--skip-graphify] [--skip-tools] [--non-interactive] [--force]`

## Step 0 — Pre-flight Environment Check

```bash
which node && node --version
which npm && npm --version
which git && git --version
```

Block if node < 18, npm < 9, or git missing. Report versions and continue.

Read `.pi/auto-commit.json` for co-author + branch config.

Resolve **`UP_PKG`** (ultimate-pi npm package root — **not** the target project cwd):

```bash
UP_PKG=""
for _pkg_root in \
  "$(node -p "try{require('path').dirname(require.resolve('ultimate-pi/package.json'))}catch{''}" 2>/dev/null)" \
  "$(npm root -g 2>/dev/null)/ultimate-pi" \
  "$(pwd)"; do
  [ -n "$_pkg_root" ] || continue
  [ -f "$_pkg_root/.pi/scripts/harness-resolve-up-pkg.mjs" ] || continue
  UP_PKG="$(node "$_pkg_root/.pi/scripts/harness-resolve-up-pkg.mjs")"
  break
done
if [ -z "$UP_PKG" ] || [ ! -f "$UP_PKG/.pi/scripts/harness-cli-verify.sh" ]; then
  echo "✗ ultimate-pi package not found. Install: pi install npm:ultimate-pi"
  exit 1
fi
echo "ultimate-pi package: $UP_PKG"
```

**Developing ultimate-pi from its git clone:** `$(pwd)` is tried last; it wins only when the clone contains `.pi/scripts/harness-resolve-up-pkg.mjs`.

For extension package names, read **`$UP_PKG/.pi/settings.example.json`**. **Merge** its `packages` array into the **project** `.pi/settings.json` (add missing entries; keep user packages). Do not copy the repo-dev `.pi/settings.json` from the package (it may contain `".."` and is not published).

## Step 0.5 — Graphify (skip if `--skip-graphify`)

**Critical:** `graphify . --wiki` and `graphify . --update` are **invalid** CLI (error: `unknown command '.'`). Use only:

| Goal | Command |
|------|---------|
| Initial / refresh code graph (required, no LLM) | `GRAPHIFY_VIZ_NODE_LIMIT=200000 graphify update .` |
| Full semantic graph (optional, needs API key) | `graphify extract .` |

On first `/harness-setup` in any project (including external repos), you **must** produce a valid `graphify-out/` with non-empty `graph.json` and `GRAPH_REPORT.md`. Do not ask the user whether to build — run the bootstrap script and **block** if it fails.

Run from the **project root** (the external repo root, not ultimate-pi unless that is the target):

```bash
mkdir -p ./raw .pi/harness/specs .pi/harness/runs .pi/harness/incidents .pi/harness/debates

# Copy JSON schemas + specs README from the package so plan-packet.schema.json exists
# in the target repo immediately (before graphify or policy-gated planning).
node "$UP_PKG/.pi/scripts/harness-seed-project-contracts.mjs" "$(pwd)"

# Bundled with ultimate-pi harness; $UP_PKG is set in Step 0
bash "$UP_PKG/.pi/scripts/harness-graphify-bootstrap.sh"
# Developing ultimate-pi from repo root: UP_PKG="$(pwd)" then same command

# Pass --force when $ARGUMENTS contains --force to rebuild an existing graph:
# bash "$UP_PKG/.pi/scripts/harness-graphify-bootstrap.sh" --force
```

If the bootstrap script is missing, run it from the installed ultimate-pi package (`.pi/scripts/` inside the npm package), or execute equivalent steps manually:

1. Install `graphifyy` (`uv tool install` preferred; else `pip`/`pip3 install --user`)
2. `graphify install --platform pi` only. **Do not** run `graphify codex install` or `graphify cursor install`.
3. `GRAPHIFY_VIZ_NODE_LIMIT=200000 graphify update .` — **required**; exits non-zero on failure
4. If `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `MOONSHOT_API_KEY` is set: `graphify extract .` for full semantic graph (optional enrichment)
5. `graphify hook install` only when `.git/` exists
6. Validate: `graphify-out/graph.json` has ≥1 node and `graphify-out/GRAPH_REPORT.md` exists

**Do not continue** to Step 2+ until validation passes. Report node/edge counts from the script output.

Read and summarize `graphify-out/GRAPH_REPORT.md` — god nodes and surprising connections.

### Failure modes (report clearly)

| Symptom | Likely cause |
|---------|----------------|
| `unknown command '.'` | Wrong CLI — use `graphify update .`, never `graphify .` |
| Empty or missing `graphify-out/` | Build step skipped or failed; re-run bootstrap |
| `graph.json` exists but 0 nodes | Stale/partial output — re-run with `--force` |
| `graphify extract` fails | No API key — code graph from `update` is still valid; note in report |

## Step 1.5 — Scrapling / harness-web (web layer)

No Docker stack or API keys. Installed by `harness-cli-verify.sh` in Step 2; optional early install:

```bash
command -v uv &>/dev/null || curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
uv tool install "scrapling[fetchers]"
scrapling install   # Chromium for default stealth scrape; may need sudo for OS libs on Linux
mkdir -p .web
python3 "$UP_PKG/.pi/scripts/harness-web.py" status   # JSON config (setup/diagnostics only)
python3 "$UP_PKG/.pi/scripts/harness-web.py" search "ultimate-pi harness" -o .web/smoke-search.json --limit 3
python3 "$UP_PKG/.pi/scripts/harness-web.py" scrape "https://example.com" -o .web/smoke-page.md --fast
```

After pi loads extensions, agents should smoke **`web_search`** once (not `UP_PKG` / `import scrapling` preflight). Example intent: query `ultimate-pi harness`, `limit` 2.

- **`--skip-tools`:** skip Step 2 (includes Scrapling verify).
- On Linux/WSL, if stealth scrape fails, install browser libs from `harness-cli-verify.sh` output or use `--fast` for static targets.

## Step 2 — Install & Verify Global CLI Tools (skip if `--skip-tools`)

Run the bundled verifier from the **project root**. It installs missing npm globals, fixes common **Linux system dependencies** (Chrome libs for `agent-browser`), runs smoke tests, and exits non-zero if a required tool fails.

```bash
bash "$UP_PKG/.pi/scripts/harness-cli-verify.sh"
# ultimate-pi checkout: same (ensure Step 0 set UP_PKG="$(pwd)" or used require.resolve)
# Reinstall everything: bash "$UP_PKG/.pi/scripts/harness-cli-verify.sh" --force
```

**Required (script must exit 0):** scrapling + harness-web smoke, ctx7, biome, ast-grep (`sg`), sentrux (when harness manifest present).

**Warnings allowed:** gh (if not authenticated), agent-browser (if OS libs need manual `sudo apt-get install`), ck (empty corpus on tiny repos).

If the script reports **agent-browser shared library errors** on Linux/WSL, run the fix it prints, then re-verify:

```bash
sudo apt-get update
sudo apt-get install -y libnss3 libnspr4 libgbm1 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libasound2 libpango-1.0-0 libcairo2 libx11-6 libxcb1 libxext6 fonts-liberation
agent-browser install --with-deps
bash "$UP_PKG/.pi/scripts/harness-cli-verify.sh"
```

**Do not continue** past Step 2 if `harness-cli-verify.sh` exits non-zero.

**After the script exits 0:** do **not** re-run sections 2.1–2.8 individually unless the script reported a specific ✗ failure. Record auth/warning lines from script output in the final report.

### Manual reference (if script missing in target repo)

Use `bash "$UP_PKG/.pi/scripts/harness-cli-verify.sh"` (see Step 0 for `UP_PKG`), or install tools individually:

### 2.1 — scrapling + harness-web (Web Search + Scrape)

Handled by `harness-cli-verify.sh` (`verify_scrapling`). Manual fallback:

```bash
uv tool install "scrapling[fetchers]"
scrapling install
mkdir -p .web
python3 "$UP_PKG/.pi/scripts/harness-web.py" search "query" -o .web/search.json --limit 5
python3 "$UP_PKG/.pi/scripts/harness-web.py" scrape "https://example.com" -o .web/page.md --fast
```

See `.agents/skills/scrapling-web/SKILL.md`.

### 2.2 — ctx7 (Context7 Library Docs + Skills Management)

```bash
if ! command -v ctx7 &>/dev/null || [ "$FORCE" = "true" ]; then
	npm install -g ctx7@latest
fi
```

Verify: `ctx7 --help`

Offer login for higher rate limits:
```bash
ctx7 login
ctx7 whoami
```

### 2.3 — agent-browser (Vercel Labs Browser Automation for AI Agents)

```bash
if ! command -v agent-browser &>/dev/null || [ "$FORCE" = "true" ]; then
	npm install -g agent-browser
fi
```

Verify:
```bash
agent-browser --version
```

Create config directory:
```bash
mkdir -p .pi/harness
```

Create default browser config if missing:
```bash
if [ ! -f .pi/harness/browser.json ]; then
	echo '{"headless": true, "timeout": 30000, "viewport": {"width": 1280, "height": 720}}' > .pi/harness/browser.json
fi
```

### 2.4 — ck-search (Semantic Code Search)

```bash
if ! command -v ck &>/dev/null || [ "$FORCE" = "true" ]; then
	npm install -g @beaconbay/ck-search
fi
```

Verify: `ck --version`

Register as MCP server (if Claude MCP available):
```bash
claude mcp list 2>/dev/null && claude mcp add ck-search -s user -- ck --serve || echo "MCP not available — ck will be used as CLI only"
```

### 2.5 — biome (Lint + Format Gate)

```bash
if ! command -v biome &>/dev/null || [ "$FORCE" = "true" ]; then
	npm install -g @biomejs/biome
fi
```

Check if project already has biome config:
```bash
ls biome.json 2>/dev/null && echo "biome.json found — using project config" || echo "No biome.json — using defaults"
```

Verify: `biome --version`

### 2.6 — ast-grep (AST-Aware Structural Code Search)

```bash
if ! command -v sg &>/dev/null || [ "$FORCE" = "true" ]; then
	npm install -g @ast-grep/cli@latest
fi
```

Verify:
```bash
sg --version && echo "✓ ast-grep installed" || echo "✗ ast-grep install failed"
```

ast-grep is the primary code search tool. It uses tree-sitter for AST-aware pattern matching — understands code structure, not just text. Replaces grep for code search tasks.

Quick smoke test:
```bash
# Search for function definitions across the codebase
sg -p 'function $NAME($$$ARGS) { $$$BODY }' --json 2>/dev/null | head -5 && echo "✓ ast-grep pattern matching works" || echo "! ast-grep smoke test — may need language-specific config"
```

### 2.7 — gh CLI (GitHub Issues Spec Storage — ADR-025)

```bash
if ! command -v gh &>/dev/null || [ "$FORCE" = "true" ]; then
	echo "gh CLI not found. Install: https://cli.github.com/"
fi
```

Verify and authenticate:
```bash
gh auth status && echo "gh authenticated" || echo "Run: gh auth login"
```

Create harness labels if authenticated:
```bash
if gh auth status &>/dev/null; then
	gh label create "harness" --color "0366d6" --description "Agentic harness managed" 2>/dev/null
	gh label create "harness-spec" --color "0e8a16" --description "Hardened specification" 2>/dev/null
	gh label create "harness-plan" --color "fbca04" --description "Structured plan generated" 2>/dev/null
	gh label create "harness-critic" --color "d73a4a" --description "Adversarial review" 2>/dev/null
fi
```

### 2.8 — sentrux (Architectural Quality Gate)

```bash
if ! command -v sentrux &>/dev/null || [ "$FORCE" = "true" ]; then
	curl -fsSL https://raw.githubusercontent.com/sentrux/sentrux/main/install.sh | sh
fi
```

Install all 52 language plugins:
```bash
sentrux plugin add-standard 2>/dev/null || echo "Plugins already installed or failed"
```

**Rules.toml bootstrap runs in Step 4.2** (idempotent, merge-safe). Sentrux CLI workflows use the package **`sentrux`** skill (`.agents/skills/sentrux`); no symlink into `.pi/skills/` required.

## Step 3 — Pi Extension Packages

Bundled extensions load from the installed `ultimate-pi` package. **Per-turn model routing** comes from a **vendored** fork of [`yeliu84/pi-model-router`](https://github.com/yeliu84/pi-model-router) in `vendor/pi-model-router/`, wired through [`.pi/extensions/pi-model-router-harness.ts`](.pi/extensions/pi-model-router-harness.ts). The harness **gates** activation on `.pi/model-router.json` (Step **3.5** below) so `router/auto` and built-in tiers such as `openai/gpt-5.4-pro` cannot load prematurely. Attribution: see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `vendor/pi-model-router/UPSTREAM_PIN.md`. Maintainer refresh: `npm run vendor:sync-router`.

Optionally install the companion lockfile used in development:

```bash
UP_PKG="$(node -p "require('path').dirname(require.resolve('ultimate-pi/package.json'))")"
if [ -f "$UP_PKG/.pi/npm/package.json" ]; then
  (cd "$UP_PKG/.pi/npm" && npm install)
  echo "✓ ultimate-pi .pi/npm dependencies"
else
  echo "✓ skip .pi/npm (not in package)"
fi
```

Merge extension entries from `$UP_PKG/.pi/settings.example.json` into this project's `.pi/settings.json` `packages` array (add any missing `npm:…` entries; keep existing user packages). **Do not add** `npm:@yeliu84/pi-model-router` (superseded by the vendored router).

Verify each package:

| Package | Purpose | Phase |
|---------|---------|-------|
| `@posthog/pi` | Analytics event capture | F0 |
| `pi-lean-ctx` | Context runtime (read/bash/find/grep/MCP bridge) | F0 |
| `harness-subagents` (bundled extension) | L4 `subagent` tool, subprocess spawns, package agents | P16 |
| Vendored `pi-vcc` (`vendor/pi-vcc`, `.pi/extensions/ultimate-pi-vcc.ts`) | VCC compaction / `vcc_recall` — env-only: `HARNESS_VCC_COMPACTION` (default on), `HARNESS_VCC_DEBUG` | Shipped |
| `pi-model-router` | Vendored (`vendor/`); activates after `.pi/model-router.json` exists | F0 |

## Step 3.5 — Model Router Configuration (Dynamic)

`.pi/model-router.json` is **user-specific** (gitignored). Generate from **Pi authenticated providers** (`~/.pi/agent/auth.json`, OAuth, env) — **not** env-var guessing alone.

Pi API (see `packages/coding-agent` docs / SDK example `02-custom-model.ts`):

- `AuthStorage.create()` → credentials store
- `ModelRegistry.create(authStorage)` → registry
- `await modelRegistry.getAvailable()` → models with working auth (same as interactive pi)

```bash
# Verify vendored extension source ships with ultimate-pi
ls "$UP_PKG/vendor/pi-model-router/extensions/index.ts" 2>/dev/null \
  && echo "✓ vendored pi-model-router" \
  || echo "✗ missing vendor/pi-model-router"

# Generate from Pi registry (skips if .pi/model-router.json exists; --force to regenerate)
node "$UP_PKG/.pi/scripts/harness-generate-model-router.mjs"
# Preview only: node "$UP_PKG/.pi/scripts/harness-generate-model-router.mjs" --dry-run

# Merge router defaults after config exists (never adds npm packages — router is vendored)
node "$UP_PKG/.pi/scripts/harness-sync-model-router.mjs"
```

If generation prints "No authenticated Pi providers": warn in report — user should run **`/login`** in pi (or `pi login`) then re-run Step 3.5. Do **not** infer providers from `OPENAI_API_KEY` alone; pi sessions often use `opencode-go` via auth.json without those env vars.

Do NOT block setup. If no config is written, `harness-sync-model-router.mjs` clears a premature `defaultProvider: "router"` in `.pi/settings.json`.

**Router onboarding** — The vendored extension starts only after `.pi/model-router.json` appears. Running the script above prepares that file plus optional Pi defaults (**`router` / `auto`**) via `harness-sync-model-router.mjs` when `defaultProvider` was unset—then **`/reload`**.

Manual override: **`/router profile auto`** anytime after reload if they changed defaults.

## Step 3.6 — Harness agents (package-resolved)

`harness-subagents` loads agents from the installed **`ultimate-pi`** package (`$UP_PKG/.pi/agents/**`) with namespaced ids (`harness/executor`, `harness/planning/scout-graphify`, `pi-pi/agent-expert`). **Do not copy** agents into the project unless you want a deliberate override.

**Slash commands are orchestrators:** `/harness-plan`, `/harness-run`, etc. spawn `harness/*` agents via the `Agent` tool — bootstrap stays **script-first**; only optionally spawn `harness/sentrux-bootstrap` for Sentrux (see Step 4.2).

Optional per-repo overrides: place `.md` files at the **same relative path** (e.g. `.pi/agents/harness/planning/scout-graphify.md` overrides the package scout).

Verify manifest drift after `pi update ultimate-pi`:

```bash
node "$UP_PKG/.pi/scripts/harness-agents-manifest.mjs" --check
```

## Step 4 — Configuration Files

### 4.0 — Project `.env` (non-destructive)

Harness extensions read config from project-root `.env` via `dotenv-loader.ts` on session start. **Never overwrite** an existing `.env`.

```bash
# If .env exists: append only missing harness keys (preserves all current values)
node "$UP_PKG/.pi/scripts/harness-sync-env.mjs"
```

If **no** `.env` at project root:

- Unless `--non-interactive`, **call `ask_user`**:

```json
{
  "question": "No .env at project root. Create one from the harness template?",
  "context": "Non-destructive: only creates if missing; never overwrites existing files.",
  "options": [
    { "title": "Create from harness template", "description": "Runs harness-sync-env.mjs --create-missing" },
    { "title": "Skip for now", "description": "Warn in report; user copies template manually later" }
  ],
  "allowFreeform": false
}
```

- On **create**: `node "$UP_PKG/.pi/scripts/harness-sync-env.mjs" --create-missing`
- On **skip** or `--non-interactive`: warn in report (non-interactive skips creation)
- If `ask_user` cancelled: stop with `needs_clarification`

### 4.0b — harness-web search engine (non-destructive)

Unless `--non-interactive`, **call `ask_user`** after Step 4.0 (harness-decisions skill):

```json
{
  "question": "Which harness-web search backend should this project use?",
  "context": "Scrapling still handles scrape/map/bulk. Search only: DuckDuckGo HTML needs no extra services. SearXNG must be self-hosted for agents — public instances often block JSON (403) and default to ~4 API requests/hour per IP.",
  "options": [
    {
      "title": "DuckDuckGo HTML (default)",
      "description": "HARNESS_WEB_SEARCH_ENGINE=ddg_html — no Docker"
    },
    {
      "title": "Self-host SearXNG here (Docker)",
      "description": "Bootstrap .searxng/ with official compose, enable JSON API, set harness env"
    },
    {
      "title": "Use existing SearXNG instance",
      "description": "You provide base URL; harness writes HARNESS_WEB_SEARXNG_URL"
    }
  ],
  "allowFreeform": true
}
```

| User choice | Actions |
|-------------|---------|
| **DDG** | Ensure `.env` has `HARNESS_WEB_SEARCH_ENGINE=ddg_html` via `harness-sync-env.mjs` (append only if missing; do not overwrite user values) |
| **Self-host** | `node "$UP_PKG/.pi/scripts/harness-searxng-bootstrap.mjs"` (requires Docker). Script sets `HARNESS_WEB_SEARCH_ENGINE=searxng` and `HARNESS_WEB_SEARXNG_URL` |
| **Existing instance** | Parse base URL from freeform answer. Run `node "$UP_PKG/.pi/scripts/harness-searxng-bootstrap.mjs" --set-url {url}` (health check + upsert `.env`) |
| **Cancelled** | Stop with `needs_clarification` |
| **`--non-interactive`** | Skip prompt; leave/default `ddg_html`; do not run Docker bootstrap |

Post-choice smoke (report pass/fail):

```bash
mkdir -p .web
python3 "$UP_PKG/.pi/scripts/harness-web.py" search "ultimate-pi harness" -o .web/setup-search.json --limit 2
```

Rules:

- **Do not** `cp` over an existing `.env`.
- **Do not** edit or remove keys the user already set.
- Re-runs only add keys from `$UP_PKG/.pi/harness/env.harness.template` that are absent (managed block at EOF).
- Ensure `.env` is gitignored (Step 4.1).

Template keys (placeholders — user fills secrets): `HARNESS_TELEMETRY_ENABLED`, `HARNESS_WEB_*`, `HARNESS_VCC_COMPACTION`, `HARNESS_VCC_DEBUG`, plus commented optional PostHog / Graphify vars.

### 4.1 — .gitignore Entries

Ensure `.gitignore` contains harness runtime entries (see repo root `.gitignore` — **do not** ignore `.pi/harness/specs/`; JSON schemas are shared contracts):

```
.env
.web/
.searxng/
.raw/
.vault-meta/
.pi/harness/active-run.json
.pi/harness/release-readiness-report.md
.pi/harness/plans/
.pi/harness/critics/
.pi/harness/runs/**
!.pi/harness/runs/README.md
.pi/harness/incidents/*
!.pi/harness/incidents/README.md
.pi/harness/debates/*
!.pi/harness/debates/README.md
.pi/harness/router/proposals/*

# Model router config (user-specific — generated from env)
.pi/model-router.json

# sentrux baselines and local meta (rules.toml is committed)
.sentrux/*
!.sentrux/
!.sentrux/rules.toml
```

### 4.2 — Sentrux rules bootstrap (required)

**Skill:** invoke **harness-sentrux-setup** before hand-editing rules or manifest.

**Optional agent:** spawn `harness/sentrux-bootstrap` if Sentrux setup needs a dedicated pass.

From **project root**, run the bundled bootstrap (seeds manifest when missing, syncs `.sentrux/rules.toml` without clobbering custom TOML):

```bash
node "$UP_PKG/.pi/scripts/harness-sentrux-bootstrap.mjs"
# After editing architecture.manifest.json:
node "$UP_PKG/.pi/scripts/harness-sentrux-bootstrap.mjs" --force
# In pi: /harness-sentrux-sync  (always --force sync)
```

| Command | When |
|---------|------|
| `harness-sentrux-bootstrap.mjs` (no flags) | `/harness-setup`, first install, re-run safe |
| `harness-sentrux-bootstrap.mjs --force` | Manifest layers/boundaries/constraints changed |
| `sentrux-rules-sync.mjs --check` | CI / harness-verify drift only |
| `/harness-sentrux-sync` | Interactive re-sync from pi |

`harness-seed-project-contracts.mjs` (Step 0.5) may copy `architecture.manifest.json` early; bootstrap still personalizes `project` on first seed and writes `rules.toml`.

Verify rules:
```bash
sentrux check . && echo "✓ sentrux rules pass" || echo "✗ sentrux check failed"
```

Set up structural regression baseline (optional):
```bash
sentrux gate --save . 2>/dev/null || echo "Baseline will be saved on first gate run"
```

### 4.3 — Project AGENTS.md

**Do not overwrite** an existing `AGENTS.md` — graphify bootstrap may have appended a `## Graphify` section. If missing, create minimal onboarding content; if present, only add harness subsections that are absent.

```markdown
# ultimate-pi: Agentic Harness

Purpose: Agentic coding harness — architecture, research, decisions, implementation.
Owner: pi-mono + user
Created: $(date +%Y-%m-%d)

## Structure

- graphify-out/ → Knowledge graph (run `graphify update .` to build)
- ./raw/ → Source documents for graphify ingestion
- .pi/harness/specs/ → Harness contracts and schema docs
- .pi/harness/incidents/ → Incident and override records
- `.agents/skills/` (npm package) → Harness skills (no copy into `.pi/skills/` needed)
- `.pi/agents/` → Optional per-repo agent overrides (package agents load automatically — see Step 3.6)

## Graphify-First Workflow

1. Run `graphify update .` to build/update the knowledge graph (AST, no API cost)
2. Read `graphify-out/GRAPH_REPORT.md` for god nodes and surprising connections
3. Query: `graphify query "question"`
4. Harness contracts and governance records in `.pi/harness/specs/` and `.pi/harness/incidents/`

## Conventions

- Graph before grep — always consult the knowledge graph first
- ./raw/ is source storage for graphify
- Decisions and incidents in `.pi/harness/` with structured artifacts
- `GRAPHIFY_VIZ_NODE_LIMIT=200000 graphify update .` after significant code changes
- ast-grep (`sg`) is the default code search tool — use `sg -p 'pattern'` for structural search, never grep for code
- Create `.sg/rules/` for project-wide code quality rules
```

## Step 5 — Verification

Re-run CLI verification (must pass unless `--skip-tools`):

```bash
bash "$UP_PKG/.pi/scripts/harness-cli-verify.sh"
```

Then run the remaining checks:

```bash
# pi extensions
UP_PKG="$(node -p "require('path').dirname(require.resolve('ultimate-pi/package.json'))")"
npm ls --prefix "$UP_PKG" 2>/dev/null | head -5 && echo "✓ ultimate-pi bundled extensions" || echo "✗ check ultimate-pi install"

# graphify knowledge graph (pip/pip3, uv, apt, or PATH)
PIP_CMD=""
command -v pip &>/dev/null && PIP_CMD=pip
[ -z "$PIP_CMD" ] && command -v pip3 &>/dev/null && PIP_CMD=pip3

if command -v graphify &>/dev/null; then
  echo "✓ graphify ($(command -v graphify))"
elif [ -n "$PIP_CMD" ] && $PIP_CMD show graphifyy &>/dev/null 2>&1; then
  echo "✓ graphify ($PIP_CMD)"
elif command -v uv &>/dev/null && uv pip show graphifyy &>/dev/null 2>&1; then
  echo "✓ graphify (uv pip)"
elif command -v uv &>/dev/null && uv tool list 2>/dev/null | grep -qE '(^|[[:space:]])graphifyy([[:space:]]|$)'; then
  echo "✓ graphify (uv tool)"
elif dpkg -l 2>/dev/null | grep -qE '^ii[[:space:]]+(python3-)?graphify' || apt list --installed 2>/dev/null | grep -qi graphify; then
  echo "✓ graphify (apt)"
else
  echo "✗ graphify not installed"
fi
python3 -c "
import json, sys
from pathlib import Path
gj, gr = Path('graphify-out/graph.json'), Path('graphify-out/GRAPH_REPORT.md')
if not gj.is_file() or not gr.is_file():
    print('✗ knowledge graph missing (need graph.json + GRAPH_REPORT.md)'); sys.exit(0)
n = len(json.loads(gj.read_text()).get('nodes') or [])
print(f'✓ knowledge graph built ({n} nodes)' if n else '✗ graph.json has 0 nodes — re-run harness-graphify-bootstrap.sh --force')
" 2>/dev/null || echo "✗ no graph built yet"
graphify hook status 2>/dev/null && echo "✓ graphify git hooks installed" || echo "✗ graphify git hooks not installed"

# vendored model router
ls "$UP_PKG/vendor/pi-model-router/extensions/index.ts" 2>/dev/null \
  && echo "✓ vendored pi-model-router" || echo "✗ vendor/pi-model-router missing"
ls .pi/model-router.json 2>/dev/null && echo "✓ model-router config" || echo "✗ model-router config"

# raw folder for graphify sources
ls -d ./raw 2>/dev/null && echo "✓ ./raw directory exists" || echo "! ./raw directory missing"

# gitignore entries
grep -q '.web/' .gitignore 2>/dev/null && echo "✓ .gitignore" || echo "! .gitignore missing entries"
```

## Step 6 — Graph Knowledge Report Bootstrap

After graph is built, read and display key findings:

```bash
# Show graph stats
python3 -c "
import json
with open('graphify-out/graph.json') as f:
    g = json.load(f)
nodes = g['nodes']
edges = g.get('edges', g.get('links', []))
communities = len(set(n.get('community', 0) for n in nodes))
god_nodes = sorted(nodes, key=lambda n: n.get('degree', 0), reverse=True)[:5]
print(f'Nodes: {len(nodes)}  |  Edges: {len(edges)}  |  Communities: {communities}')
print(f'God nodes: {[n[\"label\"] for n in god_nodes]}')
" 2>/dev/null || echo "Graph not yet built"
```

Summarize `graphify-out/GRAPH_REPORT.md` to the user.

## Step 7 — Report

Output summary table:

| Component | Status | Detail |
|-----------|--------|--------|
| Knowledge Graph | ✓/✗ | `graphify-out/graph.json` — graph status |
| Graphify Hooks | ✓/✗ | git post-commit/post-checkout hooks |
| scrapling / harness-web | ✓/✗ | Auth: yes/no |
| ctx7 | ✓/✗ | Login: yes/no |
| agent-browser | ✓/✗ | Config: .pi/harness/browser.json |
| ck-search | ✓/✗ | MCP: registered/CLI-only |
| biome | ✓/✗ | Project config: found/default |
| ast-grep | ✓/✗ | AST-aware code search (`sg`)
| gh CLI | ✓/✗ | Auth: yes/no |
| sentrux | ✓/✗ | CLI + plugins; rules via Step 4.2 bootstrap |
| Sentrux rules.toml | ✓/✗ | `.sentrux/rules.toml` synced from manifest |
| pi extensions | ✓/✗ | 4 packages |
| model router | ✓/✗ | Package + config verified, activation via `/router profile auto` |
| `.env` | ✓/✗/ask | Created / keys appended / user declined |

| .gitignore | ✓/✗ | entries added (incl. `.env`) |
| ./raw directory | ✓/✗ | Created for graphify source ingestion |
| harness-web (Scrapling) | ✓/✗ | search + scrape smoke |
| harness-web search engine | ddg / searxng / — | Step 4.0b choice; SearXNG URL if applicable |

Next steps:
1. If tools missing: re-run with `--force` or install individually
2. If graph not built: run `bash "$UP_PKG/.pi/scripts/harness-graphify-bootstrap.sh"` (or `graphify update .` from project root)
3. If hooks not installed: run `graphify hook install`
4. If gh not authenticated: `gh auth login`
5. If sentrux plugins missing: `sentrux plugin add-standard`
7. If rules.toml missing or out of date: `node "$UP_PKG/.pi/scripts/harness-sentrux-bootstrap.mjs" --force`
8. First harness run: `/harness "your task description"`

## Guard Rails

- **Internet required**: Several tools need npm registry access. Block if offline.
- **CLI verify script**: Step 2 and Step 5 run `bash "$UP_PKG/.pi/scripts/harness-cli-verify.sh"` — installs npm globals, Linux Chrome system libs for `agent-browser`, and smoke-tests each tool. Block on non-zero exit.
- **Graphify requires Python 3.10+**: Check `python3 --version`. Block if too old.
- **Graphify bootstrap is mandatory** (unless `--skip-graphify`): Run `bash "$UP_PKG/.pi/scripts/harness-graphify-bootstrap.sh"`. Never use `graphify . --wiki`. Initial setup must run `graphify update .` and verify `graphify-out/graph.json` has nodes.
- **Python packages (Graphify)**: Before install, detect via PATH, `pip`/`pip3 show graphifyy`, `uv`, or apt. Prefer `uv tool install graphifyy`.
- **Node.js >= 18 required**: Some pi packages use modern Node APIs.
- **Scrapling browsers**: `scrapling install` downloads Chromium (~hundreds of MB). Stealth scrape needs OS libs on Linux (see harness-cli-verify).
- **Idempotent**: All checks skip if already installed. `--force` overrides.
- **No destructive actions**: Creates files only if missing. Never overwrites existing content.
- **Partial success**: If some tools fail, report which and continue. User can fix individually.
- **Rate limits**: ctx7 login is optional. harness-web has no API key; respect SERP/site rate limits.


## Error Handling

| Error | Action |
|-------|--------|
| Node < 18 | Block. Report required version. |
| npm not found | Block. Suggest install method per OS. |
| Python < 3.10 | Block. Report required Python version for Graphify. |
| CLI verify script fails | Read per-tool ✗ lines. Re-run with `--force`. Fix agent-browser libs via apt (see Step 2). |
| agent-browser libnspr4 / shared library | `sudo apt-get install -y libnss3 libnspr4 libgbm1 ...` then `agent-browser install --with-deps`. |
| Graphify install fails | Show installer output. Retry `uv tool install graphifyy` or `pip3 install --user graphifyy`. Ensure `~/.local/bin` is on PATH. |
| `graphify update .` fails | Block setup. Corpus may have no code files, or graphify not on PATH. Show stderr. |
| Invalid `graphify .` usage | Replace with `graphify update .` — the `.` subcommand does not exist. |
| graphify-out empty / 0 nodes | Re-run `bash "$UP_PKG/.pi/scripts/harness-graphify-bootstrap.sh" --force` from project root. |
| graphify hook install fails | Hooks need `.git/` directory. Verify inside git repo. Manual: `git config core.hooksPath .pi/git-hooks` |
| harness-web / scrapling failed | `uv tool install "scrapling[fetchers]" && scrapling install`; re-run harness-cli-verify. |
| gh not installed | Show GitHub CLI install link. Skip label creation. |
| pi packages install fail | Show error output. Check npm permissions. |
| graph already exists | Report node count. Refresh with `graphify update .` unless user passed `--force`. |
| biome.json missing | Create minimal config. |
| settings.json not writable | Warn. Settings won't persist across sessions. |
| No internet | Block for tool installs. Continue for graphify-only steps if `--skip-tools`. |
| sentrux install fails | Show install script output. Fallback: download from https://github.com/sentrux/sentrux/releases/latest |
| No model-router.json / "No authenticated Pi providers" | Run `/login` in pi, then `node "$UP_PKG/.pi/scripts/harness-generate-model-router.mjs" --force` |
| UP_PKG not found | `pi install npm:ultimate-pi` or `npm i -g ultimate-pi`; verify with `node "$UP_PKG/.pi/scripts/harness-resolve-up-pkg.mjs"` |
| No `.env` at project root | `ask_user` create vs skip; on create: `harness-sync-env.mjs --create-missing` |

## Flags

| Flag | Effect |
|------|--------|
| `--skip-graphify` | Skip Step 0.5 (graph build). Only when a valid `graphify-out/graph.json` already exists. |
| `--skip-tools` | Skip Step 2 (CLI tool installs). Use when tools already set up. |
| `--non-interactive` | Skip all `ask_user` prompts; skip `.env` creation with warning. CI/automation only. |
| `--force` | Reinstall all tools even if already present. Overwrite existing files. |

