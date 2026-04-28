# Layer 8 — Wiki Query Interface: CLI & Agent Skill

## Origin principle

The project wiki (`wiki/`) is the single source of truth for all knowledge — design decisions, runtime patterns, specs, plans. But markdown files alone don't provide **queryability**. Agents and humans need semantic search, filtered lists, and cross-reference traversal. A custom CLI wraps Vectra-backed search and gives structured output. A skill wrapper gives agents a clean interface.

**This layer is mandatory.** Every layer reads the wiki. The query interface makes those reads efficient and semantic.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Agent / Human                     │
│                                                     │
│  ┌──────────────┐          ┌──────────────────────┐ │
│  │  wiki CLI    │          │  .pi/skills/wiki/    │ │
│  │  (terminal)  │          │  (agent instructions) │ │
│  └──────┬───────┘          └──────────┬───────────┘ │
│         │                             │              │
│         └──────────┬──────────────────┘              │
│                    │                                 │
│         ┌──────────▼──────────┐                     │
│         │  lib/wiki-kb.ts     │                     │
│         │  (core logic)       │                     │
│         │  - CRUD on wiki/    │                     │
│         │  - Vectra search    │                     │
│         │  - Embeddings       │                     │
│         └──────────┬──────────┘                     │
│                    │                                 │
│         ┌──────────▼──────────┐                     │
│         │  wiki/ (markdown)   │ ← git-tracked        │
│         │  .pi/wiki-search/  │ ← gitignored index   │
│         └─────────────────────┘                     │
└─────────────────────────────────────────────────────┘
```

## Wiki CLI

### Command: `wiki`

A Node.js CLI tool installed as a project-local script.

```bash
# Semantic/hybrid search (default mode)
wiki search <query> [--type TYPE] [--tags TAG,TAG] [--limit N] [--mode hybrid|bm25|vector]

# Retrieve single entry by ID
wiki get <ID>

# List entries by type, optionally filtered
wiki list [--type TYPE] [--tags TAG,TAG] [--limit N] [--sort created|updated|score]

# Add a new entry (interactive or from stdin)
wiki add <type> <title> [--tags TAG,TAG] [--layer L] [--related ID,ID]

# Show entries related to a given entry (semantic similarity)
wiki related <ID> [--limit N]

# Show entries that reference a given entry (backlinks)
wiki backlinks <ID>

# Index health: entry counts per type, embedding model status
wiki status

# Rebuild the Vectra index from all wiki/*.md files
wiki reindex [--force]
```

### Output format

All commands output **JSON** by default (machine-readable). Use `--pretty` for human-readable table output.

```bash
# JSON (default — agent-friendly)
$ wiki search "authentication"
[
  {
    "id": "ADR-007",
    "type": "decision",
    "title": "Wiki as Knowledge Base",
    "score": 0.89,
    "match_type": "hybrid",
    "path": "wiki/decisions/ADR-007-wiki-as-knowledge-base.md",
    "tags": ["architecture", "knowledge-base", "search"],
    "created": "2026-04-28",
    "snippet": "The project wiki is the single source of truth..."
  },
  ...
]

# Pretty (human-friendly)
$ wiki search "authentication" --pretty
ID        TYPE       SCORE  TITLE
ADR-007   decision   0.89   Wiki as Knowledge Base
SP-a1b2   success    0.72   Auth bypass fix
FP-m4n5   failure    0.65   Missing issuer validation
```

### Get command

```bash
$ wiki get ADR-007
{
  "id": "ADR-007",
  "type": "decision",
  "title": "Wiki as Knowledge Base",
  "path": "wiki/decisions/ADR-007-wiki-as-knowledge-base.md",
  "tags": ["architecture", "knowledge-base", "search"],
  "created": "2026-04-28",
  "frontmatter": { ... },
  "body": "# Wiki as Knowledge Base\n\n...",
  "related": ["ADR-004", "SP-a1b2c3d4"]
}
```

### Add command

```bash
# Interactive mode
$ wiki add pattern success "Fixed auth bypass in JWT"
# Opens editor or prompts for fields

# Pipe mode (agent-friendly)
$ echo "## Problem\nJWT had no issuer check\n## Fix\nAdded iss validation" | \
  wiki add pattern success "Fixed auth bypass" --tags auth,security --layer 4

# Returns the created entry ID
"SP-x9y8z7"
```

### Status command

```bash
$ wiki status
{
  "entries": {
    "decision": 7,
    "success_pattern": 23,
    "failure_pattern": 12,
    "spec": 5,
    "plan": 3,
    "checkpoint": 8,
    "review": 15,
    "evolution_event": 4,
    "total": 77
  },
  "index": {
    "status": "ready",
    "last_indexed": "2026-04-28T12:00:00Z",
    "model": "all-MiniLM-L6-v2",
    "model_cached": true,
    "search_mode": "hybrid"
  }
}
```

## Core library: `lib/wiki-kb.ts`

The CLI is a thin wrapper around `WikiKnowledgeBase` — the same class used by the pi.dev harness extension.

```typescript
class WikiKnowledgeBase {
  private wikiPath: string;        // wiki/ directory
  private vectraIndex: LocalIndex; // .pi/wiki-search/vectra-index/
  private embeddingModel: any;     // lazy-loaded @huggingface/transformers

  constructor(wikiPath?: string); // default: <project-root>/wiki/

  // Lifecycle
  initialize(): Promise<void>;    // Load Vectra index, optionally load embedding model
  shutdown(): Promise<void>;      // Persist Vectra index

  // Write — creates .md file + updates Vectra index
  store(entry: WikiEntry): Promise<string>;            // returns ID
  update(id: string, patch: Partial<WikiEntry>): Promise<void>;
  delete(id: string): Promise<void>;

  // Read — from .md file (always) + Vectra (for search)
  retrieve(id: string): Promise<WikiEntry | null>;

  // Search — hybrid BM25 + vector by default
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  // Type-specific convenience methods
  storeSuccessPattern(context: string, content: any, tags: string[]): Promise<string>;
  storeFailurePattern(context: string, content: any, tags: string[]): Promise<string>;
  storeDecision(context: string, decision: string, rationale: string, alternatives: string[]): Promise<string>;
  recordEvolution(event: string, files_changed: string[]): Promise<string>;

  // Cross-references
  backlinks(id: string): Promise<WikiEntry[]>;
  related(id: string, limit?: number): Promise<SearchResult[]>;

  // Retrieval helpers
  findSimilarPatterns(currentContext: string, limit?: number): Promise<SearchResult[]>;
  getRecentDecisions(count?: number): Promise<WikiEntry[]>;
  getFailurePatternsFor(tags: string[]): Promise<WikiEntry[]>;

  // Index management
  reindex(): Promise<void>;       // Rebuild Vectra index from all wiki/*.md
  status(): Promise<IndexStatus>;
}

type WikiEntry = {
  id: string;
  type: EntryType;
  title: string;
  tags: string[];
  created: string;
  updated?: string;
  layer?: string;
  related: string[];
  body: string;
  path: string;                   // e.g., wiki/decisions/ADR-007-wiki-as-knowledge-base.md
  frontmatter: Record<string, any>;
};

type EntryType =
  | "decision"
  | "success_pattern"
  | "failure_pattern"
  | "evolution_event"
  | "spec"
  | "plan"
  | "checkpoint"
  | "review";

type SearchOptions = {
  type?: EntryType;
  tags?: string[];
  limit?: number;           // default 10
  mode?: "hybrid" | "bm25" | "vector";  // default hybrid
};

type SearchResult = {
  entry: WikiEntry;
  score: number;
  match_type: "vector" | "bm25" | "hybrid";
};

type IndexStatus = {
  entries: Record<EntryType, number>;
  total: number;
  index_status: "ready" | "empty" | "building";
  last_indexed: string;
  model: string;
  model_cached: boolean;
  search_mode: string;
};
```

### Entry type → directory mapping

| Entry type | Directory | ID prefix | Filename pattern |
|------------|-----------|-----------|------------------|
| `decision` | `wiki/decisions/` | `DEC-` or `ADR-` | `ADR-007-wiki-as-knowledge-base.md` |
| `success_pattern` | `wiki/patterns/success/` | `SP-` | `SP-<id>.md` |
| `failure_pattern` | `wiki/patterns/failure/` | `FP-` | `FP-<id>.md` |
| `spec` | `wiki/specs/` | `SPEC-` | `SPEC-<id>.md` |
| `plan` | `wiki/plans/` | `PLAN-` | `PLAN-<id>.md` |
| `checkpoint` | `wiki/checkpoints/` | `CP-` | `CP-<id>.md` |
| `review` | `wiki/reviews/` | `REV-` | `REV-<id>.md` |
| `evolution_event` | `wiki/evolution/` | `EV-` | `EV-<id>.md` |

### ID generation

- ADRs: `ADR-NNN` (sequential, human-assigned for design decisions)
- Runtime entries: `<PREFIX>-<nanoid>` (auto-generated, 8-char alphanumeric, e.g. `SP-a1b2c3d4`)
- IDs are unique across the entire wiki

### Search architecture

Same two-tier approach as ADR-004, but pointing at `wiki/` instead of `.pi/harness/knowledge-base/`:

1. **Tier 1: BM25** — always available, Vectra's built-in wink-nlp. Keyword + phrase matching.
2. **Tier 2: Vector similarity** — `@huggingface/transformers` generates 384-dim embeddings. Falls back to BM25 if model unavailable.
3. **Hybrid (default)** — BM25 pre-filters by metadata, vector re-ranks by semantic closeness.

### Index location and rebuild

- Vectra index: `.pi/wiki-search/vectra-index/`
- Embedding model cache: `.pi/wiki-search/model-cache/`
- Embedding model config: `.pi/wiki-search/model-config.json`
- All gitignored. Rebuildable from `wiki/*.md` via `wiki reindex`.

```bash
# After git pull on a new device
wiki reindex
# Scans all wiki/*.md, generates embeddings, builds Vectra index
# ~2s for <500 docs, ~10s for <2000 docs, ~30s for <10000 docs
```

## Agent skill: `.pi/skills/wiki/SKILL.md`

The skill tells agents exactly how to use the wiki CLI. This is the agent-facing interface.

### Skill commands

| Command | When to use | Example |
|---------|-------------|---------|
| `wiki search <query>` | Find relevant knowledge before making decisions | `wiki search "authentication JWT"` |
| `wiki search <query> --type decision` | Find specific entry types | `wiki search "persistence" --type decision` |
| `wiki search <query> --tags TAG,TAG` | Filter by tags | `wiki search "security" --tags auth,jwt` |
| `wiki get <ID>` | Read a specific entry | `wiki get ADR-007` |
| `wiki list --type TYPE` | Browse entries of a type | `wiki list --type failure_pattern` |
| `wiki add <type> <title>` | Store a new pattern/decision | `wiki add pattern success "Fixed race condition"` |
| `wiki related <ID>` | Find semantically similar entries | `wiki related ADR-007` |
| `wiki backlinks <ID>` | Find what references this entry | `wiki backlinks ADR-007` |
| `wiki status` | Check index health | `wiki status` |
| `wiki reindex` | Rebuild search index after pull | `wiki reindex` |

### Skill triggers

- **Before any design decision:** `wiki search` to check for existing decisions
- **Before any code change:** `wiki search --type failure_pattern` to check for related failures
- **After a design decision:** `wiki add decision` to record it
- **After a successful pattern:** `wiki add pattern success` to record what worked
- **After a failure:** `wiki add pattern failure` to record what didn't work
- **After git pull on new device:** `wiki reindex` to rebuild search index
- **When uncertain about approach:** `wiki search` to find related context

## Harness integration (Layer 6)

Layer 6's `HarnessKnowledgeBase` is replaced by `WikiKnowledgeBase`. The pi.dev extension (`extensions/harness-knowledge-base.ts`) calls `WikiKnowledgeBase` which reads/writes `wiki/` instead of `.pi/harness/knowledge-base/`.

### Extension updates

| Change | Before (ADR-004) | After (ADR-007) |
|--------|-------------------|------------------|
| Vault path | `.pi/harness/knowledge-base/` | `wiki/` |
| Class | `HarnessKnowledgeBase` | `WikiKnowledgeBase` |
| Entry format | Obsidian wikilinks `[[id\|text]]` | Standard markdown links `[text](path)` |
| Index path | `.pi/harness/knowledge-base/.search/` | `.pi/wiki-search/` |
| CLI | None | `wiki` command |
| Agent interface | Extension tools only | CLI + skill + extension tools |

### Layer event hooks (unchanged functionally)

| Event | Action | Store location |
|-------|--------|---------------|
| `session_start` | Initialize `WikiKnowledgeBase`, load config | `wiki/` |
| `session_shutdown` | Persist Vectra index, flush writes | `.pi/wiki-search/` |
| `turn_end` | Auto-capture decision rationale | `wiki/decisions/DEC-<id>.md` |
| `spec_hardened` | Store hardening decisions | `wiki/decisions/DEC-<id>.md` |
| `plan_approved` | Store plan + planning decisions | `wiki/plans/PLAN-<id>.md`, `wiki/decisions/DEC-<id>.md` |
| `subtask_completed` | Store checkpoint + evolution | `wiki/checkpoints/CP-<id>.md`, `wiki/evolution/EV-<id>.md` |
| `subtask_verified` | Store success pattern | `wiki/patterns/success/SP-<id>.md` |
| `subtask_failed` | Store failure pattern | `wiki/patterns/failure/FP-<id>.md` |

## Error states

| Error | Recovery |
|-------|----------|
| `embedding_model_unavailable` | Fall back to BM25-only search; log info; do not block |
| `embedding_download_failed` | Skip semantic search permanently for session; log warning |
| `wiki_write_failure` | Fall back to in-memory; log error |
| `vectra_index_corruption` | `wiki reindex` rebuilds from `wiki/*.md`; ~2-30 seconds |
| `wiki_full` (max_entries reached) | Evict by priority: evolution → success → decision → never failure |

## New dependencies

| Package | Size | Purpose |
|---------|------|---------|
| `vectra` | ~1.8MB | Local vector DB with hybrid search |
| `@huggingface/transformers` | ~5MB core | Local embedding model (ONNX) |
| Model: `all-MiniLM-L6-v2` | ~80MB (cached) | 384-dim sentence embeddings |
| `commander` | ~200KB | CLI argument parsing |
| `nanoid` | ~5KB | ID generation for runtime entries |

## Build order (within harness implementation)

After Phase 1 (Foundation schemas):
1. `lib/wiki-kb.ts` — WikiKnowledgeBase class (replaces HarnessKnowledgeBase)
2. `tools/wiki-cli.ts` — CLI wrapper around WikiKnowledgeBase
3. `.pi/skills/wiki/SKILL.md` — Agent skill instructions
4. Update `extensions/harness-knowledge-base.ts` — use WikiKnowledgeBase instead

This comes **before** other harness layers because every layer reads the wiki.

## Verification criteria

1. `wiki status` shows correct entry counts from `wiki/` directory
2. `wiki search "authentication"` returns semantically relevant results
3. `wiki search "auth" --type decision` filters correctly
4. `wiki get ADR-007` retrieves the full entry
5. `wiki add pattern success "Test" --tags test` creates a file in `wiki/patterns/success/`
6. `wiki reindex` rebuilds the Vectra index from scratch
7. `wiki backlinks ADR-007` finds entries that reference it
8. TypeScript compiles (`npm run check:ts`)
9. Extension loads in pi.dev (`/harness-kb-status` responds)