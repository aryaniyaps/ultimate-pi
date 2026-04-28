---
type: module
title: Wiki Query Interface
status: developing
created: 2026-04-28
updated: 2026-04-28
tags: [harness, wiki, search, claude-obsidian, layer-8, query]
layer: "8"
sources:
  - "[[harness-implementation-plan]]"
related:
  - "[[agentic-harness]]"
  - "[[persistent-memory]]"
---

# Wiki Query Interface (claude-obsidian Skills)

Layer 8 of the [[agentic-harness]]. The query interface to the wiki. Uses claude-obsidian skills in GitHub Mode B — LLM-native search via hot.md → index.md → pages. See [[adr-009]].

## Architecture

```
Agent / Human
  ├── wiki-query (read)  ──→ wiki/hot.md → index.md → pages
  ├── wiki-ingest (write) ──→ wiki/ (create/update pages)
  └── wiki-lint (health)  ──→ orphan/contradiction checks
```

## Query Operations

### Three Depth Modes

| Mode | Code | Reads | Tokens |
|------|------|-------|--------|
| **Quick** | `query quick:` | hot.md + index.md | ~1,500 |
| **Standard** | default | hot.md → index → 3-5 pages | ~3,000 |
| **Deep** | `query deep:` | Full wiki + optional web | ~8,000+ |

## Ingest Operations

| Harness Event | Wiki Write | Frontmatter |
|--------------|-----------|-------------|
| `spec_hardened` | `decisions/ADR-<N>.md` | `type: decision` |
| `plan_approved` | `flows/PLAN-<id>.md` | `type: flow` |
| `subtask_completed` | Append to `log.md` | Operation log entry |
| `subtask_verified` | `modules/<name>.md` | `type: module` |
| `subtask_failed` | `modules/<name>.md` | `> [!contradiction]` |

## Lint Operations (after every 10-15 writes)

1. Orphan pages
2. Dead links
3. Stale claims
4. Missing pages
5. Frontmatter gaps
6. Empty sections
7. Stale index entries

Output: `wiki/meta/lint-report-YYYY-MM-DD.md`

## Dependencies

- 24 obsidian-wiki skills (`npx skills add Ar9av/obsidian-wiki --yes`)
- 5 obsidian-skills (`npx skills add kepano/obsidian-skills --yes`)