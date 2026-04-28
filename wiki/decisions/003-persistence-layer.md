# ADR-003: Persistence Layer for Harness Memory and State (SUPERSEDED)

> **This ADR is superseded by ADR-007** (`wiki/decisions/ADR-007-wiki-as-knowledge-base.md`), via ADR-004.
>
> ADR-003 specified JSONL + in-memory indexes. ADR-004 replaced it with Obsidian-compatible Markdown vault + Vectra. ADR-007 replaces ADR-004 by merging the knowledge base into the project `wiki/` directory with a custom CLI and agent skill.

## Original analysis

The problems identified in ADR-003 are still valid:

1. **`better-sqlite3` is a native module** — breaks zero-dep requirement
2. **Flat files have no query capability** — no semantic search, no cross-referencing
3. **No human readability** — can't browse memory in an editor
4. **No graph visualization** — can't see how entries connect

ADR-004 solves all of these with Obsidian vault + Vectra.

## Original decision (superseded)

**Use a single JSONL file for memory, with an in-memory index built on startup.** No SQLite, no native modules.

**This is superseded by ADR-004's decision: Obsidian-compatible Markdown vault + Vectra semantic search.**

## What ADR-004 adds over ADR-003

| Concern | ADR-003 (JSONL) | ADR-004 (Obsidian + Vectra) |
|---------|-----------------|------------------------------|
| Human readability | Must parse JSONL | Open `.md` file in any editor |
| Cross-referencing | Manually join on IDs | Wikilinks `[[entry-id]]` with graph view |
| Semantic search | Not possible | Vectra hybrid BM25 + vector similarity |
| Graph visualization | Not possible | Obsidian graph view |
| Token-efficient retrieval | O(n) text scan | O(k) metadata filter + vector re-rank |

## Alternatives considered (original analysis)

| Alternative | Why rejected then | Why ADR-004 is better |
|---|---|---|
| `better-sqlite3` | Native C++ dep | Still rejected (ADR-004 also avoids native deps) |
| `sql.js` (WASM SQLite) | 2MB WASM binary | Still not human-readable |
| LevelDB / `level` | Key-value only | No cross-referencing or semantic search |
| Plain JSON files | No query capability | ADR-004 uses Markdown + Vectra |
| Postgres via Archon | Tight coupling | ADR-004 keeps knowledge base local |