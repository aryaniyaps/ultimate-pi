# ADR-009: Replace Custom Wiki Layer with obsidian-wiki (ar9av) + obsidian-skills (kepano)

**Date:** 2026-04-28
**Status:** Accepted
**Supersedes:** ADR-007 (wiki-as-knowledge-base), partially ADR-004 (obsidian-vault-vectra)

## Context

Our current wiki layer (ADR-007) built a custom `WikiKnowledgeBase` class + `wiki` CLI + Vectra semantic search from scratch. This works but has gaps:

1. **No cross-session continuity** — every session starts with zero context about what happened before
2. **No source tracking** — no immutable `.raw/` layer, no delta tracking, no provenance
3. **No structural health checks** — no orphan detection, dead-link detection, stale-claim flagging
4. **No query depth modes** — one search mode, no quick/standard/deep tiers
5. **No auto-research** — the wiki is write-only from harness events; no autonomous knowledge acquisition
6. **No hot cache** — every session reads the full index to get context
7. **Flat cross-references** — plain markdown links, no wikilinks, no contradiction flagging
8. **Manual lint only** — no automated wiki maintenance
9. **Vectra dependency** — ~80MB embedding model, custom TypeScript code, build complexity
10. **No batch ingest** — one-at-a-time entry creation only

The [obsidian-wiki](https://github.com/AgriciDaniel/obsidian-wiki) project provides a mature, skill-based Obsidian vault system specifically designed for AI-agent knowledge management. Its GitHub Mode (Mode B) maps directly to our repository/codebase knowledge needs, and its operation suite (ingest, query, lint, save, autoresearch) covers every gap above.

## Decision

**Replace the custom wiki layer (ADR-007) with obsidian-wiki's skill suite, operating in GitHub Mode (Mode B).**

### What we adopt from obsidian-wiki

| Component | What it replaces | What we gain |
|-----------|------------------|--------------|
| `/wiki` skill + sub-skills (`wiki-ingest`, `wiki-query`, `wiki-lint`) | Custom `WikiKnowledgeBase` class + `wiki` CLI | Skill-driven agent-native operations, 3 query depths, lint health checks |
| Mode B (GitHub) folder structure | Custom `wiki/` layout with `decisions/`, `patterns/`, etc. | Proven structure: `modules/`, `components/`, `decisions/`, `dependencies/`, `flows/` |
| `wiki/hot.md` (hot cache) | Nothing (current system has no cross-session cache) | ~500-word recent context carry-over between sessions |
| `wiki/index.md` (master catalog) | Custom Vectra-based search | Structured, always-current index of all pages |
| `wiki/log.md` (operation log) | Nothing (current system has no audit trail) | Append-only log of all ingest/query/lint operations |
| Wikilinks `[[Page Name]]` | Plain markdown links `[text](path)` | Obsidian-compatible cross-referencing, graph view, backlinks |
| `.raw/` immutable source layer | Nothing | Source provenance, delta tracking, no overwriting |
| Contradiction callouts `> [!contradiction]` | Nothing | Explicit conflict flagging between wiki entries |
| DragonScale addresses (opt-in) | Custom `ADR-NNN` / `SP-<nanoid>` IDs | Deterministic, stable page addressing `c-NNNNNN` |
| Frontmatter schema with typed fields | Custom `WikiEntry` type | Richer metadata: `type`, `status`, `confidence`, `sources` |
| Lint system (8+ checks) | Nothing | Automated: orphans, dead links, stale claims, missing pages, frontmatter gaps |
| Batch ingest with delta tracking | Single entry creation | Parallel processing, manifest-based dedup |

### What we keep from our harness

| Component | Why we keep it |
|-----------|---------------|
| Harness schemas (`harness-schemas.ts`) | Inter-layer data contracts. obsidian-wiki is the storage engine, not the schema engine. |
| Harness config (`harness-config.ts`) | Layer tuning parameters. |
| All extension event hooks | The harness still writes to wiki on `spec_hardened`, `plan_approved`, etc. — but via obsidian-wiki skills instead of `WikiKnowledgeBase.store()`. |
| Archon workflow YAML | Orchestration unchanged. |
| Entry type mapping | Our `EntryType` enum maps to obsidian-wiki's `type` frontmatter field. |

### Architecture change

**Before (ADR-007):**
```
Harness layers → WikiKnowledgeBase.ts → wiki/ (markdown) + .pi/wiki-search/ (Vectra)
                wiki CLI (custom tool) → WikiKnowledgeBase.ts
                .pi/skills/wiki/SKILL.md → wiki CLI
```

**After (ADR-009):**
```
Harness layers → .pi/skills/wiki-ingest/ (obsidian-wiki skill) → wiki/ (Obsidian vault)
                .pi/skills/wiki-query/ (obsidian-wiki skill) → wiki/ (read hot.md → index.md → pages)
                .pi/skills/wiki-lint/ (obsidian-wiki skill) → wiki/ (health checks)
                .pi/skills/wiki/ (orchestrator) → routes to sub-skills
                wiki/hot.md → cross-session context cache
                wiki/index.md → structured catalog (replaces Vectra search for most queries)
                .raw/ → immutable source documents
```

### Directory mapping: harness entry types → obsidian-wiki Mode B

| Harness `EntryType` | Current directory | New directory | Notes |
|----------------------|-------------------|---------------|-------|
| `decision` | `wiki/decisions/` | `wiki/decisions/` | Direct match — Mode B's `decisions/` |
| `success_pattern` | `wiki/patterns/success/` | `wiki/modules/` or `wiki/components/` | Success patterns become module/component notes with `status: mature` |
| `failure_pattern` | `wiki/patterns/failure/` | `wiki/flows/` or `wiki/modules/` | Failure patterns become notes with `> [!contradiction]` or `status: deprecated` |
| `spec` | `wiki/specs/` | `wiki/decisions/` or `wiki/modules/` | Specs become decision notes with `type: decision` and `decision_type: spec` |
| `plan` | `wiki/plans/` | `wiki/flows/` | Plans become flow notes with `plan_status` frontmatter |
| `checkpoint` | `wiki/checkpoints/` | `wiki/log.md` entries | Checkpoints inline in operation log |
| `review` | `wiki/reviews/` | `wiki/decisions/` | Reviews become decision notes with `review_*` frontmatter |
| `evolution_event` | `wiki/evolution/` | `wiki/log.md` entries | Evolution events inline in operation log |

### What we remove

| Component | Why removed |
|-----------|-------------|
| `lib/wiki-kb.ts` (`WikiKnowledgeBase`) | Replaced by obsidian-wiki skills writing directly to `wiki/` |
| `tools/wiki-cli.ts` (custom CLI) | Replaced by skill-driven `ingest`, `query`, `lint` operations |
| `@huggingface/transformers` dependency | No longer needed — obsidian-wiki uses LLM-native reading + `.raw/` delta tracking instead of local embeddings |
| `vectra` dependency | No longer needed — `wiki/index.md` + `wiki/hot.md` + wikilink traversal replaces vector search for most queries |
| `.pi/wiki-search/` directory | No longer needed — no Vectra index |
| `all-MiniLM-L6-v2` model (~80MB) | No longer needed |
| Custom embedding pipeline | Replaced by LLM-native reading strategy |

### Search strategy change

**Before:** Vectra hybrid search (BM25 + vector embeddings). Requires model download, index build, ~80MB cache.

**After:** Layered LLM-native reading (from obsidian-wiki wiki-query skill):
1. **Quick mode** (~1,500 tokens): Read `wiki/hot.md` only. Covers recent context.
2. **Standard mode** (~3,000 tokens): Read `hot.md` → `index.md` → 3-5 relevant pages. Most queries.
3. **Deep mode** (~8,000+ tokens): Full wiki scan for synthesis/comparison questions.

This works because:
- `wiki/index.md` is a structured catalog with titles, types, and one-line descriptions
- `wiki/hot.md` provides cross-session continuity at ~500 words
- Wikilinks provide traversal (`[[Page Name]]` → follow 2 levels deep)
- LLMs are the search engine — no vector index needed for ≤10k entries

For projects exceeding 10k wiki entries, DragonScale optional semantic tiling (via local ollama `nomic-embed-text`) can be enabled.

### New dependencies

| Component | Size | Purpose |
|-----------|------|---------|
| obsidian-wiki skills (files) | ~50KB | Agent skill instructions for ingest/query/lint/save |
| Obsidian (optional, for graph view) | Free app | Human browsing, graph visualization, backlinks |
| `ollama` + `nomic-embed-text` (optional) | ~300MB | DragonScale semantic tiling for large wikis |
| `scripts/allocate-address.sh` (opt-in) | ~2KB | DragonScale deterministic page addressing |

**Removed dependencies:** `vectra` (~1.8MB), `@huggingface/transformers` (~5MB), `all-MiniLM-L6-v2` model (~80MB), `commander` (~200KB), `nanoid` (~5KB).

Net dependency reduction: ~87MB → ~50KB (or ~350KB with optional DragonScale).

## Alternatives considered

| Alternative | Why rejected |
|-------------|-------------|
| Keep ADR-007 system + add hot cache and lint | Reinventing what obsidian-wiki already provides. Two systems to maintain. |
| Keep ADR-007 but use Vectra search for indexing only | Still requires 80MB model download and custom TypeScript search code. LLM-native reading is simpler. |
| Use obsidian-wiki without Mode B | Generic structure doesn't map to our codebase knowledge needs. Mode B gives `modules/`, `decisions/`, `flows/` which align with harness output. |
| Use obsidian-wiki Mode B exactly as-is without mapping | Would lose our harness-specific entry types and event hooks. Need the mapping layer. |
| Use obsidian-wiki MCP server integration | Requires Obsidian running + Local REST API plugin. Our harness runs headless in CI/CD. Skills are the right interface. |

## Consequences

### Positive
- **Cross-session continuity**: `hot.md` carries recent context between sessions — our biggest gap
- **Source provenance**: `.raw/` provides immutable source tracking — currently missing
- **Wiki health**: Lint catches orphans, dead links, stale claims, missing cross-references
- **Batch ingest**: Delta tracking via `.raw/.manifest.json` prevents re-processing
- **Contradiction flagging**: `> [!contradiction]` callouts surface conflicts explicitly
- **Simpler architecture**: No Vectra index, no embedding model, no custom search code
- **Dependency reduction**: ~87MB → ~50KB core, ~300KB optional
- **LLM-native search**: Works with any LLM, no model-specific embeddings
- **Obsidian-optional**: Graph view, backlinks, properties panel available if Obsidian installed, but not required

### Negative / Risks
- **Lost Vectra semantic search**: Hybrid BM25+vector search replaced by LLM-native reading. Large wikis (>10k entries) may need DragonScale semantic tiling for dedup detection. Mitigation: Mode B naturally maintains ~500-2000 pages (one per module/component/decision/flow).
- **Token cost for queries**: Standard query costs ~3,000 tokens (hot.md + index + pages). Deep queries cost ~8,000+ tokens. Our Vectra search was "free" after index build. Mitigation: hot cache short-circuits most queries at ~500 tokens.
- **Wikilink syntax**: Switching from `[text](path)` to `[[Page Name]]` means updates to existing wiki entries. Mitigation: one-time migration script.
- **Obsidian as soft dependency**: Skills work without Obsidian, but graph view, backlinks, and properties panel require it. Mitigation: Obsidian is free, and skills are fully functional without it.
- **obsidian-wiki is external**: Skill files come from an external repository. Mitigation: install as a pinned skill or vendor the skill files into the project.