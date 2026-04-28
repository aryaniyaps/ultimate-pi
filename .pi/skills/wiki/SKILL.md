# Wiki Skill (obsidian-wiki + obsidian-skills)

## Purpose

Query and maintain the project wiki — the single source of truth for design decisions, runtime patterns, specs, and module knowledge. Uses [obsidian-wiki](https://github.com/ar9av/obsidian-wiki) skills for wiki operations in GitHub Mode and [obsidian-skills](https://github.com/kepano/obsidian-skills) for Obsidian-flavored markdown formatting.

## Installed skills

| Skill | Source | Purpose |
|-------|--------|---------|
| `wiki-setup` | ar9av/obsidian-wiki | Scaffold new vault, initialize structure |
| `wiki-ingest` | ar9av/obsidian-wiki | Distill sources into wiki pages |
| `wiki-query` | ar9av/obsidian-wiki | Answer questions from the wiki (3 depth modes) |
| `wiki-lint` | ar9av/obsidian-wiki | Health check: orphans, dead links, contradictions |
| `wiki-status` | ar9av/obsidian-wiki | Show what's ingested, what's pending |
| `wiki-rebuild` | ar9av/obsidian-wiki | Archive, rebuild from scratch, or restore |
| `wiki-update` | ar9av/obsidian-wiki | Sync current project knowledge into the vault |
| `wiki-capture` | ar9av/obsidian-wiki | Save current conversation as a wiki note |
| `wiki-research` | ar9av/obsidian-wiki | Autonomous multi-round web research |
| `wiki-export` | ar9av/obsidian-wiki | Export vault graph to JSON, GraphML, Neo4j, HTML |
| `wiki-dashboard` | ar9av/obsidian-wiki | Create dynamic Obsidian Bases dashboard views |
| `wiki-synthesize` | ar9av/obsidian-wiki | Discover and fill synthesis gaps |
| `wiki-history-ingest` | ar9av/obsidian-wiki | Mine past Pi agent sessions for knowledge |
| `cross-linker` | ar9av/obsidian-wiki | Auto-discover and insert missing wikilinks |
| `tag-taxonomy` | ar9av/obsidian-wiki | Enforce consistent tag vocabulary |
| `obsidian-markdown` | kepano/obsidian-skills | Correct Obsidian-flavored syntax |
| `obsidian-bases` | kepano/obsidian-skills | Create/edit .base files (database views) |
| `json-canvas` | kepano/obsidian-skills | Create/edit .canvas files (visual maps) |
| `obsidian-cli` | kepano/obsidian-skills | Interact with running Obsidian via CLI |
| `defuddle` | kepano/obsidian-skills | Extract clean markdown from web pages |

## Activation

Use wiki skills when you need to:
- Look up decisions or ADRs → `wiki-query`
- Ingest new knowledge → `wiki-ingest`
- Mine past Pi sessions → `wiki-history-ingest`
- Record decisions, patterns, events → `wiki-capture` or `wiki-ingest`
- Check wiki health → `wiki-lint`
- Set up or rebuild → `wiki-setup` / `wiki-rebuild`
- Sync project knowledge → `wiki-update`
- Find missing cross-references → `cross-linker`
- Enforce consistent tags → `tag-taxonomy`

## Harness integration (Layer 7)

| Harness event | Wiki skill | Frontmatter |
|--------------|-----------|-------------|
| `spec_hardened` | `wiki-ingest` | type: decision, decision_type: spec |
| `plan_approved` | `wiki-ingest` | type: flow, plan_status: approved |
| `subtask_verified` | `wiki-ingest` | type: module, status: mature |
| `subtask_failed` | `wiki-ingest` | type: module, status: deprecated, contradiction callout |
| `turn_end` | `wiki-capture` | Auto-capture decision rationale |
| Session start | `wiki-query` (quick) | Read hot.md |
| Session end | `wiki-update` | Update hot.md, log.md, index.md |

## Conventions

- Always `wiki-query` before decisions
- Use `obsidian-markdown` for correct wikilink syntax
- Use `wiki-lint` after every 10+ writes
- Tags: lowercase, hyphen-separated
- `.raw/` sources are immutable
- `wiki/log.md` is append-only (new entries at TOP)
- `wiki/hot.md` is overwritten (~500 words max)
