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

The wiki lives in the [GitHub wiki repo](https://github.com/aryaniyaps/ultimate-pi.wiki.git) and is checked out locally at `~/wiki/ultimate-pi`. Most wiki skills need this vault configured. One-time setup:

### Step 1 — Activate the GitHub wiki

The repo must have at least one page before you can clone it:

1. Go to `https://github.com/aryaniyaps/ultimate-pi/wiki`
2. Click **Create the first page** (or **New Page** if it already exists)
3. Save any content — this activates the wiki git endpoint

### Step 2 — Clone and initialize the vault

```bash
git clone https://github.com/aryaniyaps/ultimate-pi.wiki.git ~/wiki/ultimate-pi
cd ~/wiki/ultimate-pi

# Create folder structure
mkdir -p {concepts,entities,skills,references,synthesis,journal,projects,_archives,_raw,.obsidian}
```

This creates the folder layout wiki skills expect:
- `concepts/` `entities/` `skills/` `references/` `synthesis/` `journal/` — topic folders
- `projects/` — per-project knowledge
- `_archives/` — wiki snapshots for rebuild/restore
- `_raw/` — staging area; drop drafts here, `wiki-ingest` promotes them

### Step 3 — Create special files

The vault root needs three files. `wiki-setup` auto-generates them, or create manually:

**Home.md** — top-level wiki index (must be `Home.md` for GitHub wiki)

```markdown
---
title: Wiki Index
---

# Wiki Index

*This index is automatically maintained. Last updated: 2026-04-28*

## Concepts

*No pages yet. Use `wiki-ingest` to add your first source.*

## Entities

## Skills

## References

## Synthesis

## Journal
```

**log.md** — append-only changelog

**hot.md** — semantic cache of recent activity (~500 words)

### Step 4 — Create `.gitignore`

```bash
cat > .gitignore << 'EOF'
.obsidian/
_raw/
_archives/
.DS_Store
EOF
```

### Step 5 — Commit and push

```bash
git add -A
git commit -m "init: obsidian wiki vault structure"
git push
```

### Step 6 — Configure `.env` in your project

In your project root, create `.env`:

```bash
# Required: absolute path to your Obsidian vault
OBSIDIAN_VAULT_PATH=~/wiki/ultimate-pi

# Optional: source directories to ingest from (comma-separated)
OBSIDIAN_SOURCES_DIR=~/Documents

# Optional: QMD collections for semantic search in wiki-query
# QMD_WIKI_COLLECTION=
# QMD_PAPERS_COLLECTION=
```

### Step 7 — Open in Obsidian

1. Open Obsidian → **File → Open Vault** → select `~/wiki/ultimate-pi`
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

### Obsidian wiki skills (25 skills)

Installed via `npx skills add Ar9av/obsidian-wiki --yes` or bundled:

| Skill | What it does |
|---|---|
| llm-wiki | Foundational knowledge-distillation pattern theory (raw → wiki → schema). |
| wiki-setup | Initialize a new Obsidian vault with correct structure and config. |
| wiki-ingest | Distill documents/sources into interconnected wiki pages. |
| wiki-query | Search the wiki and answer questions with citations. |
| wiki-status | Show wiki state: ingested, pending, delta vs sources. |
| wiki-lint | Audit wiki health: orphans, broken links, stale content. |
| wiki-update | Sync current project knowledge into the wiki. |
| wiki-capture | Save current conversation as a structured wiki note. |
| wiki-rebuild | Archive and rebuild the wiki from scratch. |
| wiki-research | Autonomous multi-round web research → wiki. |
| wiki-export | Export knowledge graph to JSON, GraphML, Neo4j, HTML. |
| wiki-dashboard | Create dynamic dashboard views using Obsidian Bases. |
| wiki-synthesize | Discover cross-cutting synthesis opportunities across pages. |
| cross-linker | Auto-discover and insert missing wikilinks between pages. |
| tag-taxonomy | Enforce consistent tagging via controlled vocabulary. |
| graph-colorize | Color-code the Obsidian graph view by tag/folder. |
| data-ingest | Ingest raw text data (chat exports, CSVs, logs) into wiki. |
| ingest-url | Fetch a URL and distill its content into the wiki. |
| skill-creator | Create, modify, and benchmark skills with evals. |

### Obsidian editor skills (5 skills)

Installed via `npx skills add kepano/obsidian-skills --yes` or bundled:

| Skill | What it does |
|---|---|
| obsidian-markdown | Create/edit Obsidian Flavored Markdown (wikilinks, callouts, frontmatter). |
| obsidian-cli | CLI interaction with Obsidian vaults — read, create, search, manage notes. |
| obsidian-bases | Create database-like views (.base files) with filters, formulas, summaries. |
| json-canvas | Create visual canvases (.canvas) — mind maps, flowcharts, node graphs. |
| defuddle | Extract clean markdown from web pages, stripping clutter. |

### Runtime guardrail extension

- `extensions/lean-ctx-enforce.ts`
  - Detects `lean-ctx` availability (cached check).
  - Overrides built-in `read` tool to execute through `lean-ctx read` when available.
  - Overrides built-in `bash` tool and auto-wraps commands with `lean-ctx -c <command>` when needed.
  - Falls back to default built-in tools if `lean-ctx` is unavailable.
  - Adds status command:
    - `/lean-ctx-status`

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

## Use locally

From repo root:

```bash
pi install . -l
```

Then restart PI or run `/reload`.

## Terminal-Bench evaluation (local only)

Use Harbor custom-agent flow from docs:

```bash
npm run bench:terminal
```

Scaffold files live in `bench/terminal-bench/` and are excluded from npm publish via `.npmignore`.