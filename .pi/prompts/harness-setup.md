---
description: Full harness bootstrap — obsidian wiki scaffold, CLI tools install, pi extension packages, and verification. Run once per project.
argument-hint: "[--skip-wiki] [--skip-tools] [--force] [--wiki-path <path>]"
---

# harness-setup — Full Harness Bootstrap

Bootstraps the complete ultimate-pi agentic harness: Obsidian wiki vault, CLI tools, pi extension packages, configuration files, and verification. Idempotent — safe to re-run, skips what's already installed.

## Step 0 — Pre-flight Environment Check

```bash
which node && node --version
which npm && npm --version
which git && git --version
```

Block if node < 18, npm < 9, or git missing. Report versions and continue.

Read `.pi/auto-commit.json` for co-author + branch config. Read `.pi/settings.json` for extension packages list and `wiki_path` field (if present).

## Step 0.5 — Resolve Wiki Vault Path + Detect Existing Vault

Resolve the wiki vault path with this priority:

1. **CLI flag** `--wiki-path <path>` (highest priority — user explicitly passed it)
2. **Env var** `VAULT_WIKI_PATH` (set by project or user shell config)
3. **Settings file** `.pi/settings.json` → `wiki_path` field
4. **Default** `vault/wiki` (relative to project root)

```bash
# Resolve logic
if [ -n "$CLI_WIKI_PATH" ]; then
  WIKI_PATH="$CLI_WIKI_PATH"
elif [ -n "$VAULT_WIKI_PATH" ]; then
  WIKI_PATH="$VAULT_WIKI_PATH"
else
  WIKI_PATH="$(node -e "try{const s=require('./.pi/settings.json');if(s.wiki_path)process.stdout.write(s.wiki_path)}catch(e){}" 2>/dev/null)"
  WIKI_PATH="${WIKI_PATH:-vault/wiki}"
fi

# Normalize to absolute path (relative paths are relative to project root)
if [[ "$WIKI_PATH" != /* ]]; then
  WIKI_PATH="$(pwd)/$WIKI_PATH"
fi

# Detect if a vault already exists at the resolved path
# Vault indicators: .obsidian/ folder OR wiki/index.md OR wiki/log.md
if [ -d "$WIKI_PATH/.obsidian" ] || [ -f "$WIKI_PATH/index.md" ] || [ -f "$WIKI_PATH/log.md" ]; then
  VAULT_EXISTS=true
  # Quick stats
  PAGE_COUNT=$(find "$WIKI_PATH" -name "*.md" -type f 2>/dev/null | wc -l)
  LAST_LOG=$(head -5 "$WIKI_PATH/log.md" 2>/dev/null || echo "unknown")
else
  VAULT_EXISTS=false
fi
```

**Present to user explicitly — context-aware:**

### Case A: Env var was set + vault found

> "`VAULT_WIKI_PATH` is set to `$VAULT_WIKI_PATH`. Vault detected: $PAGE_COUNT pages, last updated $LAST_LOG. Confirm this is the correct vault?"

### Case B: Env var was set + NO vault found

> "`VAULT_WIKI_PATH` is set to `$VAULT_WIKI_PATH`, but no vault found there (no `.obsidian/`, `index.md`, or `log.md`). Where should we create the wiki vault? (Press Enter to use this path, or type a different path)"

### Case C: Settings had wiki_path + vault found

> "Found `wiki_path: <path>` in `.pi/settings.json`. Vault detected: $PAGE_COUNT pages, last updated $LAST_LOG. Use this vault?"

### Case D: No env var, no settings → defaulting

> "No `VAULT_WIKI_PATH` env var or `wiki_path` in settings found. Default path: `$(pwd)/vault/wiki`. Where should we create the wiki vault? (Press Enter for default, or type a different path)"

### Case E: All sources agree on path + vault found

> "Wiki vault: `$WIKI_PATH` ($PAGE_COUNT pages, last updated $LAST_LOG). Use this?"

**Wait for user confirmation before proceeding.** This is the ONLY blocking question. If user provides a different path, update `WIKI_PATH`, re-detect, and re-confirm.

**DX principles:**
- Always show the resolved absolute path so user knows exactly where files go.
- Always show the *source* of the path (env var, settings, default) so user understands WHY this path was chosen.
- When no vault is detected, ask explicitly — don't just silently create at the default.
- Don't check for `.obsidian/` in project root as a fallback. The vault can live anywhere.

## Step 1 — Wiki Scaffold

Run the `/wiki` prompt flow using the user-confirmed `$WIKI_PATH`:

1. If `VAULT_EXISTS=true` (detected in Step 0.5): skip scaffold. Move to Step 2.
2. If `VAULT_EXISTS=false`: ask ONE question: "What is this vault for?"
3. Scaffold full wiki structure based on answer at `$WIKI_PATH`:
   ```
   $WIKI_PATH/
   ├── index.md          # master catalog
   ├── log.md            # chronological operations log
   ├── hot.md            # recent context summary
   ├── overview.md       # executive summary
   ├── sources/          # source document summaries
   ├── entities/         # people, orgs, products, repos
   ├── concepts/         # ideas, patterns, frameworks
   ├── decisions/        # ADRs + design decisions
   ├── questions/        # filed research answers
   ├── modules/          # code module documentation
   ├── flows/            # pipeline/process flows
   ├── consensus/        # debate verdict records
   ├── meta/             # dashboards, lint reports
   └── components/       # reusable sub-modules
   ```
4. Create `$WIKI_PATH/../.vault-meta/` with vault metadata (at project root level, not inside wiki).
5. Create vault `AGENTS.md` in project root with mode, purpose, conventions, operations.
6. Initialize wiki git tracking if not already present.
7. Write initial `$WIKI_PATH/hot.md` with setup timestamp.
8. **Save resolved path** to `.pi/settings.json` (merge `"wiki_path": "<relative-path>"` into settings) for future sessions.

## Step 2 — Install Global CLI Packages

Check each package first. Install only if missing unless `--force` flag.

### 2.1 — firecrawl-cli (Web Search + Scrape + Crawl + Interact + Download + Parse)

```bash
if ! command -v firecrawl &>/dev/null || [ "$FORCE" = "true" ]; then
	npm install -g firecrawl-cli@latest
fi
```

Verify:
```bash
firecrawl --status
```

If not authenticated, offer browser login or API key:
```bash
firecrawl login --browser
# OR
firecrawl login --api-key "<key>"
```

Install skills and run quick smoke test:
```bash
firecrawl setup skills
mkdir -p .firecrawl
firecrawl scrape "https://firecrawl.dev" -o .firecrawl/install-check.md
```

### 2.2 — defuddle-cli (Web Page Cleaner)

```bash
if ! command -v defuddle &>/dev/null || [ "$FORCE" = "true" ]; then
	npm install -g defuddle-cli
fi
```

Verify: `defuddle --version`

### 2.3 — ctx7 (Context7 Library Docs + Skills Management)

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

### 2.4 — agent-browser (Vercel Labs Browser Automation for AI Agents)

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

### 2.5 — ck-search (Semantic Code Search)

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

### 2.6 — fallow (Codebase Intelligence: Dead Code, Duplication, Complexity)

```bash
if ! command -v fallow &>/dev/null || [ "$FORCE" = "true" ]; then
	npm install -g fallow
fi
```

Verify:
```bash
fallow --version
```

Set up baseline for existing codebases:
```bash
fallow audit --gate all --format json > .fallow-baseline.json 2>/dev/null || echo "No baseline yet — will be created on first gate run"
```

### 2.7 — biome (Lint + Format Gate)

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

### 2.8 — gh CLI (GitHub Issues Spec Storage — ADR-025)

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

## Step 3 — Pi Extension Packages

Install pi extension packages from `.pi/settings.json`:

```bash
cd .pi/npm
npm install
```

Verify each package:

| Package | Purpose | Phase |
|---------|---------|-------|
| `@posthog/pi` | Analytics event capture | F0 |
| `pi-lean-ctx` | Context runtime (read/bash/find/grep/MCP bridge) | F0 |
| `@tintinweb/pi-subagents` | L4 critic sub-agent spawn/control | P16 |

## Step 4 — Configuration Files

### 4.1 — .gitignore Entries

Ensure `.gitignore` contains:
```
.firecrawl/
.raw/
.vault-meta/
.fallow-baseline.json
.pi/harness/critics/
.pi/harness/plans/
.pi/harness/specs/
```

### 4.2 — Vault AGENTS.md

If not already created by Step 1, create a minimal `AGENTS.md` in project root:

```markdown
# ultimate-pi: Agentic Harness Wiki

Mode: B (Engineering Research + System Design)
Purpose: Knowledge base for the ultimate-pi agentic coding harness — architecture, research, decisions, implementation plans.
Owner: pi-mono + user
Created: $(date +%Y-%m-%d)
Wiki vault path: `$WIKI_PATH`

## Structure

`$WIKI_PATH/`
├── index.md → master catalog
├── log.md → chronological operations
├── hot.md → recent context cache
├── concepts/ → ideas, patterns, frameworks (harness layers, drift detection, skill-first architecture)
├── decisions/ → ADRs for every architectural choice
├── modules/ → code module docs (harness implementation plan, pipeline)
├── sources/ → reference materials
├── entities/ → tools, platforms, people
├── questions/ → filed research answers
├── consensus/ → debate verdicts
└── flows/ → pipeline diagrams

## Conventions

- YAML frontmatter required: type, status, created, updated, tags
- Wikilinks: [[Page Name]] format
- .raw/ is immutable source storage
- $WIKI_PATH/index.md updated on every ingest
- $WIKI_PATH/log.md is append-only, newest at top

## Cross-Project Reference

Other projects can reference this vault:
1. Read $WIKI_PATH/hot.md (~500 tokens)
2. Read $WIKI_PATH/index.md if needed
3. Drill into specific topics as needed

## Path Resolution

This vault's filesystem path is set via:
- Env var: `VAULT_WIKI_PATH` (current: `$VAULT_WIKI_PATH` or unset)
- Settings: `.pi/settings.json` → `wiki_path`
- Default fallback: `vault/wiki`
```

## Step 5 — Verification

Run full verification suite using resolved `$WIKI_PATH`:

```bash
# CLI tools
firecrawl --status 2>/dev/null && echo "✓ firecrawl" || echo "✗ firecrawl"
defuddle --version 2>/dev/null && echo "✓ defuddle" || echo "✗ defuddle"
ctx7 --help 2>/dev/null && echo "✓ ctx7" || echo "✗ ctx7"
agent-browser --version 2>/dev/null && echo "✓ agent-browser" || echo "✗ agent-browser"
ck --version 2>/dev/null && echo "✓ ck-search" || echo "✗ ck-search"
fallow --version 2>/dev/null && echo "✓ fallow" || echo "✗ fallow"
biome --version 2>/dev/null && echo "✓ biome" || echo "✗ biome"
gh --version 2>/dev/null && echo "✓ gh" || echo "✗ gh"

# pi extensions
cd .pi/npm && npm ls 2>/dev/null && echo "✓ pi extensions" || echo "✗ pi extensions"

# wiki vault (using resolved WIKI_PATH)
ls "$WIKI_PATH/index.md" 2>/dev/null && echo "✓ wiki vault" || echo "✗ wiki vault"
ls "$WIKI_PATH/hot.md" 2>/dev/null && echo "✓ wiki hot cache" || echo "✗ wiki hot cache"

# settings persistence
grep -q 'wiki_path' .pi/settings.json 2>/dev/null && echo "✓ wiki path saved to settings" || echo "! wiki path not saved"

# gitignore entries
grep -q '.firecrawl/' .gitignore 2>/dev/null && echo "✓ .gitignore" || echo "! .gitignore missing entries"
```

## Step 6 — Wiki Hot Cache Bootstrap

Write initial `$WIKI_PATH/hot.md`:
```markdown
---
type: meta
title: "Hot Cache"
updated: $(date -u +%Y-%m-%dT%H:%M:%S)
created: $(date +%Y-%m-%d)
tags: []
status: active
---

# Recent Context

## Last Updated
$(date +%Y-%m-%d). Harness setup completed. All CLI tools installed, wiki vault scaffolded at `$WIKI_PATH`, pi extensions configured.

## Key Facts
- Harness runs 8-layer mandatory pipeline (L1 → L2 → L2.5 → L3 → L4 → P20 → L5 → L6 → L7 → L8)
- Implementation: skill-first v2 — 4 code files, 6 harness skills
- Wiki vault: Mode B (Engineering Research + System Design)
- Wiki path: `$WIKI_PATH`
- ADRs filed in `$WIKI_PATH/decisions/`
- Consensus debate verdicts filed in `$WIKI_PATH/consensus/`

## Recent Changes
- Created: Full wiki vault structure

- Installed: firecrawl-cli, defuddle-cli, ctx7, agent-browser, ck-search, fallow, biome, gh

## Active Threads
- Next: run first spec through pipeline with `/harness "task description"`
```

## Step 7 — Report

Output summary table:

| Component | Status | Detail |
|-----------|--------|--------|
| Wiki Vault | ✓/✗ | Path: `$WIKI_PATH` — scaffold complete / task pending |
| firecrawl-cli | ✓/✗ | Auth: yes/no |
| defuddle-cli | ✓/✗ | Version |
| ctx7 | ✓/✗ | Login: yes/no |
| agent-browser | ✓/✗ | Config: .pi/harness/browser.json |
| ck-search | ✓/✗ | MCP: registered/CLI-only |
| fallow | ✓/✗ | Baseline: created/pending |
| biome | ✓/✗ | Project config: found/default |
| gh CLI | ✓/✗ | Auth: yes/no |
| pi extensions | ✓/✗ | 3 packages |

| .gitignore | ✓/✗ | 6 entries added |
| wiki_path in settings | ✓/✗ | Persisted to .pi/settings.json |

Next steps:
1. If tools missing: re-run with `--force` or install individually
2. If wiki not scaffolded: run `/wiki` prompt
3. If gh not authenticated: `gh auth login`
4. First harness run: `/harness "your task description"`
5. To change wiki path later: update `VAULT_WIKI_PATH` env var or `.pi/settings.json` → `wiki_path` field

## Guard Rails

- **Internet required**: Several tools need npm registry access. Block if offline.
- **Wiki path must be writable**: Check `test -w "$(dirname "$WIKI_PATH")"` before scaffold. Block if not writable.
- **Wiki path outside project**: Allowed (e.g., `~/vaults/my-project`). Cross-project vault sharing is supported.
- **Node.js >= 18 required**: Some pi packages use modern Node APIs.
- **Idempotent**: All checks skip if already installed. `--force` overrides.
- **No destructive actions**: Creates files only if missing. Never overwrites existing wiki content.
- **Wiki safety**: Scaffold only creates structure, never modifies existing wiki content.
- **Partial success**: If some tools fail, report which and continue. User can fix individually.
- **Rate limits**: ctx7 login is optional. firecrawl auth is required for web operations.
- **Settings persistence**: The resolved `wiki_path` is saved to `.pi/settings.json` so future sessions auto-detect it.

## Error Handling

| Error | Action |
|-------|--------|
| Node < 18 | Block. Report required version. |
| npm not found | Block. Suggest install method per OS. |
| Wiki path not writable | Block. Show path and suggest `chmod` or different path. |
| Wiki path already has vault + `--skip-wiki` not set | Report state, ask if user wants to skip or force re-scaffold. |
| `VAULT_WIKI_PATH` and `wiki_path` in settings disagree | Resolve with priority (env var wins), warn user about mismatch, ask to confirm. |
| firecrawl auth failed | Show manual login instructions. Continue with other tools. |
| gh not installed | Show GitHub CLI install link. Skip label creation. |
| pi packages install fail | Show error output. Check npm permissions. |
| wiki already exists | Report state, skip scaffold, continue other steps. |
| biome.json missing | Create minimal config. |
| settings.json not writable | Warn. Wiki path won't persist across sessions. |
| No internet | Block for tool installs. Continue for wiki-only steps if `--skip-tools`. |

## Flags

| Flag | Effect |
|------|--------|
| `--skip-wiki` | Skip Step 1 (wiki scaffold). Use when wiki already exists. |
| `--skip-tools` | Skip Step 2 (CLI tool installs). Use when tools already set up. |
| `--force` | Reinstall all tools even if already present. Overwrite existing files. |
| `--wiki-path <path>` | Override wiki vault path. Absolute or relative to project root. Bypasses env var and settings. |
