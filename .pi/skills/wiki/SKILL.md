# Wiki Skill (claude-obsidian GitHub Mode)

## Purpose

Query and maintain the project wiki — the single source of truth for design decisions, runtime patterns, specs, and module knowledge. The wiki uses claude-obsidian's skill-driven operations (ingest, query, lint) in **GitHub Mode (Mode B)** for repository/codebase knowledge management.

## Architecture

The wiki is an Obsidian-compatible vault using:
- **Wikilinks** `[[Page Name]]` for cross-references
- **YAML frontmatter** for structured metadata
- **`.raw/`** for immutable source documents
- **`wiki/hot.md`** for ~500-word cross-session context cache
- **`wiki/index.md`** for structured catalog of all pages
- **`wiki/log.md`** for append-only operation audit trail
- **LLM-native search** (hot.md → index.md → relevant pages) instead of Vectra

## Activation

Use this skill when you need to:
- Look up design decisions or ADRs before making changes
- Find related patterns (success or failure) for the current task
- Record a decision, pattern, or evolution event
- Check if something was already decided or attempted
- Browse wiki entries by type or tag
- Lint the wiki for health issues

## Operations

### INGEST — Write to wiki (from wiki-ingest skill)

When the harness writes a pattern, decision, or evolution event:

1. Determine harness entry type → map to Mode B type + directory
2. Create/update wiki page with frontmatter in correct directory
3. Update `wiki/index.md` — add entry for new page
4. Update `wiki/hot.md` — overwrite with recent context
5. Append to `wiki/log.md` — new entry at TOP
6. Check for contradictions — add `> [!contradiction]` callouts if needed

### QUERY — Read from wiki (from wiki-query skill)

Three depth modes:

| Mode | Reads | Tokens | When to use |
|------|-------|--------|-------------|
| **Quick** | `wiki/hot.md` + `wiki/index.md` | ~1,500 | Simple factual lookups, "did we decide X?" |
| **Standard** | hot.md → index.md → 3-5 pages | ~3,000 | Most harness decisions |
| **Deep** | Full wiki + optional web | ~8,000+ | Synthesis, gap analysis, comparisons |

### LINT — Health check (from wiki-lint skill)

After every 10-15 writes, or on demand:
- Orphan pages, dead links, stale claims, missing pages
- Frontmatter gaps, empty sections, stale index entries
- Output: `wiki/meta/lint-report-YYYY-MM-DD.md`

## Harness entry type → Mode B mapping

| Harness type | Wiki directory | Frontmatter `type` | Notes |
|-------------|---------------|---------------------|-------|
| decision | `wiki/decisions/` | `decision` | Direct match |
| success_pattern | `wiki/modules/` or `wiki/components/` | `module` / `component` | Add `status: mature` |
| failure_pattern | `wiki/modules/` or `wiki/flows/` | `module` / `flow` | Add `status: deprecated`, `> [!contradiction]` |
| spec | `wiki/decisions/` | `decision` | Add `decision_type: spec` |
| plan | `wiki/flows/` | `flow` | Add `plan_status` |
| checkpoint | `wiki/log.md` append | N/A | Logged as operation entry |
| review | `wiki/decisions/` | `decision` | Add `review_*` fields |
| evolution_event | `wiki/log.md` append | N/A | Logged as operation entry |

## Frontmatter template (Mode B + harness extensions)

```yaml
---
type: module              # module | component | decision | dependency | flow
status: active            # seed | developing | mature | evergreen | deprecated
path: "src/auth/"         # for modules/components
language: typescript
purpose: ""
maintainer: ""
last_updated: 2026-04-28
depends_on: []
used_by: []
tags: [module]
created: 2026-04-28
updated: 2026-04-28
# Harness-specific extensions
layer: "Layer_4"
spec_id: "SPEC-abc123"
plan_id: "PLAN-def456"
harness_entry_type: "success_pattern"
related:
  - "[[Architecture Overview]]"
sources:
  - "[[.raw/articles/source.md]]"
---
```

## When to use

| Situation | Operation | Depth |
|-----------|-----------|-------|
| Before any design decision | QUERY | Standard |
| Before code changes | QUERY | Quick (hot.md) |
| After making a decision | INGEST | — |
| After a success | INGEST (type: module, status: mature) | — |
| After a failure | INGEST (type: module, status: deprecated, contradiction callout) | — |
| Unsure about approach | QUERY | Deep |
| After 10+ writes | LINT | — |
| Session start | Read wiki/hot.md | Quick |
| Session end | Update wiki/hot.md + wiki/log.md | — |

## Conventions

- Always query `wiki/hot.md` first — it may already have what you need
- Always query `wiki/index.md` to find relevant pages before deep reads
- Wikilinks use `[[Page Name]]` format — filenames must be unique
- `.raw/` contains source documents — never modify them
- `wiki/log.md` is append-only — new entries at TOP
- `wiki/hot.md` is overwritten completely each time — ~500 words max
- Tags: lowercase, hyphen-separated (e.g., `auth`, `jwt-validation`)
- Layer: use Layer number (e.g., `Layer_4`) when entry comes from a harness layer
- DragonScale addresses are opt-in — enabled if `scripts/allocate-address.sh` present

## File locations

- Wiki entries: `wiki/` directory (decisions, modules, components, flows, etc.)
- Hot cache: `wiki/hot.md`
- Master catalog: `wiki/index.md`
- Operation log: `wiki/log.md`
- Source documents: `.raw/` (immutable, never modify)
- Manifest: `.raw/.manifest.json` (delta tracking)
- Lint reports: `wiki/meta/lint-report-YYYY-MM-DD.md`
- Schema reference: `WIKI.md` at vault root