# Layer 8 — Wiki Query Interface: claude-obsidian Skills (ADR-009)

## Origin principle

The project wiki (`wiki/`) is the single source of truth for all knowledge — design decisions, runtime patterns, specs, module knowledge. **ADR-009** replaces the custom `WikiKnowledgeBase` class + Vectra search stack with [claude-obsidian](https://github.com/AgriciDaniel/claude-obsidian) skills operating in GitHub Mode (Mode B).

**This layer is mandatory.** Every layer reads the wiki. The query interface makes those reads efficient and the ingest interface ensures writes are structured, cross-referenced, and audited.

## Why claude-obsidian Mode B

| Capability | Before (ADR-007) | After (ADR-009) |
|------------|-------------------|------------------|
| Cross-session memory | None | `wiki/hot.md` ~500-word cache |
| Source provenance | No tracking | `.raw/` + manifest delta tracking |
| Repository structure | Flat `patterns/` dirs | Mode B: `modules/`, `components/`, `decisions/`, `dependencies/`, `flows/` |
| Search | Vectra hybrid BM25+vector (~80MB model) | LLM-native: hot.md → index.md → pages |
| Lint/health | None | 8+ category lint checks |
| Contradiction flagging | None | `> [!contradiction]` callouts |
| Batch ingest | One-at-a-time | Delta tracking via `.raw/.manifest.json` |
| Cross-references | Plain markdown links | Wikilinks `[[Page Name]]` + backlinks |
| Dependencies | ~87MB (Vectra + transformers + model) | ~50KB (skills) + optional ~300MB (DragonScale) |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Agent / Human                     │
│                                                     │
│  ┌──────────────┐  ┌───────────────┐               │
│  │ wiki-query   │  │ wiki-ingest    │               │
│  │ (read)       │  │ (write)        │               │
│  └──────┬───────┘  └───────┬───────┘               │
│         │                  │                         │
│  ┌──────┴──────────────────┴───────┐                │
│  │     .pi/skills/wiki/           │                │
│  │     (orchestrator + routing)   │                │
│  └──────────────┬─────────────────┘                │
│                 │                                   │
│  ┌──────────────▼─────────────────┐                │
│  │     wiki-lint                  │                │
│  │     (health check)             │                │
│  └───────────────────────────────┘                │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │            wiki/ (Obsidian vault)           │   │
│  │  hot.md  index.md  log.md  overview.md      │   │
│  │  decisions/ modules/ components/ flows/     │   │
│  │  dependencies/ sources/ entities/ concepts/ │   │
│  │  meta/  layers/                              │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  .raw/ (immutable sources + manifest)        │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Query operations (wiki-query skill)

### Three depth modes

| Mode | Trigger | Reads | Token cost | Best for |
|------|---------|-------|------------|----------|
| **Quick** | `query quick: ...` or simple factual Q | `wiki/hot.md` + `wiki/index.md` | ~1,500 | "Did we decide X?", "What's the auth module status?" |
| **Standard** | default | hot.md → index.md → 3-5 pages | ~3,000 | Most harness decisions |
| **Deep** | `query deep: ...` or "thorough" | Full wiki + optional web | ~8,000+ | Synthesis, comparison, gap analysis |

### Quick mode workflow

1. Read `wiki/hot.md`. If it answers the question, respond immediately.
2. If not, read `wiki/index.md`. Scan for the answer.
3. If found in index, respond. If not, suggest standard mode.

### Standard mode workflow

1. Read `wiki/hot.md` first.
2. Read `wiki/index.md` to find relevant pages.
3. Read those pages (3-5 typically). Follow wikilinks to depth-2.
4. Synthesize answer. Cite with wikilinks: `(Source: [[Page Name]])`.
5. Offer to file as `wiki/concepts/` or `wiki/questions/` if valuable.

### Deep mode workflow

1. Read `wiki/hot.md` and `wiki/index.md`.
2. Identify ALL relevant pages across sections.
3. Read every relevant page. No skipping.
4. If wiki coverage is thin, offer to supplement with web search.
5. Synthesize comprehensive answer with citations.
6. Always file result back as a wiki page.

## Ingest operations (wiki-ingest skill)

### Harness event → wiki write mapping

| Harness event | Wiki write | Frontmatter fields |
|--------------|-----------|-------------------|
| `spec_hardened` | `wiki/decisions/ADR-<N>.md` | `type: decision`, `decision_type: spec`, `spec_id`, `layer: "Layer_1"` |
| `plan_approved` | `wiki/flows/PLAN-<id>.md` | `type: flow`, `plan_status: approved`, `layer: "Layer_2"` |
| `subtask_completed` | Append to `wiki/log.md` | Operation log entry |
| `subtask_verified` | `wiki/modules/<name>.md` | `type: module`, `status: mature`, `harness_entry_type: success_pattern` |
| `subtask_failed` | `wiki/modules/<name>.md` | `type: module`, `status: deprecated`, `> [!contradiction]` callout |
| `turn_end` (auto-capture) | `wiki/decisions/DEC-<id>.md` | `type: decision`, auto-generated |

## Lint operations (wiki-lint skill)

After every 10-15 wiki writes:

1. Orphan pages, dead links, stale claims, missing pages
2. Frontmatter gaps, empty sections, stale index entries
3. Output: `wiki/meta/lint-report-YYYY-MM-DD.md`

## Extension event hooks

| Event | Action | Wiki operation |
|-------|--------|---------------|
| `session_start` | Read `wiki/hot.md`, scaffold wiki if needed | QUERY (quick) |
| `session_shutdown` | Update `wiki/hot.md`, append to `wiki/log.md` | INGEST |
| `turn_end` | Auto-capture decision rationale | INGEST (decision) |
| `spec_hardened` | Store spec as decision with `decision_type: spec` | INGEST (decision) |
| `plan_approved` | Store plan as flow with `plan_status: approved` | INGEST (flow) |
| `subtask_verified` | Store success pattern as module with `status: mature` | INGEST (module) |
| `subtask_failed` | Store failure pattern with contradiction callout | INGEST (module) |

## Error handling

| Error | Recovery |
|-------|----------|
| `wiki/hot.md` missing | Create from `wiki/index.md` summary + recent decisions |
| `wiki/index.md` stale | Trigger wiki-lint rebuild or manual reindex |
| Contradiction between pages | Flag with `> [!contradiction]` callouts; do not overwrite |
| Missing page for concept | Create stub with `status: seed`; add to lint report |

## Verification criteria

1. `wiki/hot.md` exists and contains recent context summary
2. `wiki/index.md` lists all wiki pages organized by type
3. Wiki-lint produces a clean report
4. Harness layer hooks create/update wiki entries correctly
5. All wiki pages use YAML frontmatter with Mode B types
6. Extension loads in pi.dev (`/harness-kb-status` responds)