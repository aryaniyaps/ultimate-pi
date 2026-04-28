# Wiki Skill

## Purpose

Query and maintain the project wiki — the single source of truth for design decisions, patterns, specs, and runtime knowledge. The wiki has semantic search via Vectra (hybrid BM25 + vector similarity).

## Activation

Use this skill when you need to:
- Look up design decisions or ADRs before making changes
- Find related patterns (success or failure) for the current task
- Record a decision, pattern, or evolution event
- Check if something was already decided or attempted
- Browse wiki entries by type or tag

## Commands

All commands run from project root. Output is JSON by default. Add `--pretty` for human-readable tables.

### Search (semantic/hybrid)

```bash
wiki search "<query>"
wiki search "<query>" --type decision
wiki search "<query>" --tags auth,security
wiki search "<query>" --limit 5
wiki search "<query>" --mode bm25
```

Default mode: `hybrid` (BM25 pre-filter + vector re-rank). Falls back to `bm25` if embedding model unavailable.

### Get by ID

```bash
wiki get <ID>
# e.g. wiki get ADR-007
```

### List entries

```bash
wiki list --type failure_pattern
wiki list --tags auth --limit 10
```

### Add entry

```bash
# Interactive
wiki add pattern success "Title of success pattern"

# Piped (agent-friendly)
echo "## Problem\n..." | wiki add pattern success "Title" --tags auth,security --layer 4
```

Types: `decision`, `success_pattern`, `failure_pattern`, `spec`, `plan`, `checkpoint`, `review`, `evolution_event`

### Related entries (semantic similarity)

```bash
wiki related <ID>
wiki related <ID> --limit 3
```

### Backlinks (what references this entry)

```bash
wiki backlinks <ID>
```

### Index status

```bash
wiki status
```

Shows entry counts per type, embedding model status, last indexed timestamp.

### Rebuild index

```bash
wiki reindex
```

Run after `git pull` on a new device, or if `wiki status` shows stale index.

## When to use

| Situation | Command |
|-----------|---------|
| Before any design decision | `wiki search "<topic>" --type decision` |
| Before code changes | `wiki search "<area>" --type failure_pattern` |
| After making a decision | `wiki add decision "Decision title" --tags <tags>` |
| After a success | `wiki add pattern success "What worked" --tags <tags>` |
| After a failure | `wiki add pattern failure "What failed" --tags <tags>` |
| Unsure about approach | `wiki search "<context>"` |
| On new device after pull | `wiki reindex` |
| Check wiki health | `wiki status` |

## Conventions

- Always `wiki search` before recording a new decision — check for duplicates
- Tags: lowercase, hyphen-separated (e.g., `auth`, `jwt-validation`, `error-handling`)
- Layer: use Layer number (e.g., `Layer_4`) when entry comes from a specific harness layer
- Related: reference other wiki entries by ID (e.g., `ADR-007`, `SP-a1b2c3d4`)
- Decisions use `ADR-NNN` format for design ADRs, `DEC-<nanoid>` for runtime decisions
- All wiki entries are git-tracked and should be committed

## File locations

- Wiki entries: `wiki/` directory (decisions, patterns, specs, plans, etc.)
- Search index: `.pi/wiki-search/` (gitignored, rebuildable)
- Embedding model: `.pi/wiki-search/model-cache/` (gitignored, ~80MB one-time download)