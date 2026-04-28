# Layer 6 — Persistent Structured Memory & Pattern Libraries

## Origin principle

Humans have persistent biological memory. Agents don't. Every context window starts fresh. The harness needs an explicit memory layer — a **knowledge base** — that persists across sessions, supports cross-referencing, and enables semantic search. This is what makes the system improve over time.

**This layer is mandatory. It is the substrate every other layer reads and writes.**

## Persistence decision (ADR-007)

**Project wiki (`wiki/`) as single source of truth + Vectra semantic search + custom CLI.** The wiki holds all knowledge — design decisions, runtime patterns, specs, plans — in git-tracked markdown with YAML frontmatter. Semantic search via Vectra. Query interface via `wiki` CLI and agent skill.

| Component | Technology | Why |
|-----------|-----------|-----|
| Knowledge store | `wiki/` directory (git-tracked markdown) | Single source of truth. Git = sync across devices. PR review = consistency enforcement. |
| Semantic search | Vectra (local, file-backed vector DB) | Hybrid BM25 + vector similarity, pure TypeScript, no external services |
| Embeddings | `@huggingface/transformers` (local ONNX) | `all-MiniLM-L6-v2`, 384 dims, ~80MB one-time download, no API calls |
| Full-text search | Vectra's built-in BM25 | Always available, no model download needed |
| Query interface | `wiki` CLI command | Agent-friendly JSON output, structured queries, semantic search |
| Agent interface | `.pi/skills/wiki/` skill | Agents invoke CLI via skill instructions |
| Search index | `.pi/wiki-search/` (gitignored, rebuildable) | Vectra index + embedding cache |

See `wiki/decisions/ADR-007-wiki-as-knowledge-base.md` for full rationale. See `wiki/layers/08-wiki-query-interface.md` for CLI and skill specs.

## Purpose

A cross-referenced, semantically searchable knowledge base where success patterns accumulate, failures are never repeated, decisions are retrievable, and context loss between sessions is mitigated. All stored in the project wiki — the same place as ADRs and layer specs.

## Wiki structure

```
wiki/
  decisions/              # ADRs — architectural decisions (existing)
    ADR-007-wiki-as-knowledge-base.md
    ...
  layers/                 # Layer specs (existing)
    06-persistent-memory.md
    08-wiki-query-interface.md
    ...
  patterns/                # Runtime patterns from harness execution
    success/
      SP-<id>.md            # Success pattern entries
    failure/
      FP-<id>.md            # Failure pattern entries
  specs/                   # Hardened specifications
    SPEC-<id>.md
  plans/                   # Execution plans
    PLAN-<id>.md
  checkpoints/             # Grounding checkpoints
    CP-<id>.md
  reviews/                 # Critic reviews
    REV-<id>.md
  evolution/               # Codebase evolution events
    EV-<id>.md
  harness-implementation-plan.md
```

Search index (gitignored, rebuildable):
```
.pi/wiki-search/
  vectra-index/              # Vectra local index files
  model-config.json          # Embedding model metadata
  model-cache/               # Cached embedding model (~80MB)
  embedding-cache/           # Cached embeddings
```

## Entry format

Each entry is a Markdown file with YAML frontmatter. Cross-references use standard markdown links or frontmatter `related` arrays — no wikilink syntax (ADR-007 supersedes Obsidian format).

### Example: Success pattern

```markdown
---
id: SP-a1b2c3d4
type: success_pattern
tags: [auth, api, security, login]
created: 2026-04-28T21:00:00Z
layer: Layer_4
related: [DEC-x7y8z9, FP-m4n5o6, SPEC-j2k3l4]
---

# Success Pattern: Authentication bypass fix

## Problem
JWT token validation was missing issuer check, allowing token replay across environments.

## Approach
Added `iss` claim validation to JWT middleware with environment-specific allowed issuers.

## Outcome
Passed all 4 critic focus areas (correctness, security, performance, spec_compliance).

## Code Snippets
```typescript
const allowedIssuers = config.get('jwt.allowedIssuers');
if (!allowedIssuers.includes(decoded.iss)) {
  throw new AuthError('Invalid token issuer');
}
```

## Related
- [Decision: Use JWT for authentication](../decisions/DEC-x7y8z9.md)
- [Failure: Previous auth attempt](failure/FP-m4n5o6.md)
- [Spec: User authentication module](../specs/SPEC-j2k3l4.md)
```

### Example: Failure pattern

```markdown
---
id: FP-m4n5o6
type: failure_pattern
tags: [auth, security, token]
created: 2026-04-26T10:30:00Z
layer: Layer_4
related: [SP-a1b2c3d4]
---

# Failure Pattern: Missing issuer validation in JWT

## Problem
JWT middleware accepted tokens from any issuer.

## Approach
Naive JWT verification without issuer check.

## Failure Mode
Security critic identified authentication bypass vulnerability (severity: critical).

## Lesson
Always validate `iss` claim in JWT tokens. Scope allowed issuers per environment.

## Related
- [Success: Auth bypass fix](success/SP-a1b2c3d4.md)
```

### Example: Decision

```markdown
---
id: DEC-x7y8z9
type: decision
tags: [auth, architecture, jwt]
created: 2026-04-25T14:00:00Z
layer: Layer_2
related: [SP-a1b2c3d4, SPEC-j2k3l4]
---

# Decision: Use JWT for authentication

## Decision
Use JSON Web Tokens for service-to-service authentication.

## Rationale
Stateless, widely supported, allows claims-based authorization without database lookups.

## Alternatives Considered
- Session-based auth: requires shared state store
- API keys: no claim-based authorization
- mTLS: complex certificate management

## Related
- [Success: Auth bypass fix](../patterns/success/SP-a1b2c3d4.md)
- [Spec: Authentication module](../specs/SPEC-j2k3l4.md)
```

## Data contract

```typescript
type WikiEntry = {
  id: string;
  type: "success_pattern" | "failure_pattern" | "decision" | "evolution_event" | "spec" | "plan" | "checkpoint" | "review";
  title: string;
  tags: string[];
  created: string;
  updated?: string;
  layer?: string;
  related: string[];          // reference IDs
  file_path: string;          // path to .md file in wiki/
  frontmatter: Record<string, any>;
};

type SearchResult = {
  entry: WikiEntry;
  score: number;               // 0-1 similarity score
  match_type: "vector" | "bm25" | "hybrid";
};
```

## Behavior

### Write patterns (always active — every layer writes)

| Layer | When | Type written | Wiki path |
|-------|------|-------------|-----------|
| Layer 1 | Spec hardened | `decision` (hardening choices, ambiguities) | `wiki/decisions/DEC-<id>.md` |
| Layer 2 | Plan approved | `decision` (planning choices, risks) | `wiki/decisions/DEC-<id>.md` |
| Layer 3 | Checkpoint recorded | `evolution_event` (files changed) | `wiki/evolution/EV-<id>.md` |
| Layer 3 | Drift detected | `failure_pattern` (drift causes) | `wiki/patterns/failure/FP-<id>.md` |
| Layer 3 | Execution complete | `success_pattern` (completed plan) | `wiki/patterns/success/SP-<id>.md` |
| Layer 4 | Subtask verified | `success_pattern` (verified solution) | `wiki/patterns/success/SP-<id>.md` |
| Layer 4 | Subtask failed | `failure_pattern` (critic failure) | `wiki/patterns/failure/FP-<id>.md` |
| Layer 5 | Observability defined | `decision` (metric choices) | `wiki/decisions/DEC-<id>.md` |

### Read patterns (always active — every layer reads)

| Layer | When | Query type |
|-------|------|-----------|
| Layer 1 | Hardening a spec | Semantic: "find patterns related to this request" |
| Layer 2 | Creating a plan | BM25: `tags=[<scope_tags>]` type=failure_pattern |
| Layer 3 | Starting execution | Recent: last 5 decisions |
| Layer 4 | Running critics | Semantic: "find similar failure modes" |
| Layer 5 | Defining observability | Recent: last 3 decisions about metrics |

### Auto-capture (always active)

Hook on `turn_end`: heuristic detection of decision rationale in assistant text:
- Triggers: "because", "rationale", "reason:", "decided to", "chose to", "trade-off"
- Auto-stores as `decision` entry in `wiki/decisions/` with related references in frontmatter

### Search modes

| Mode | When | How |
|------|------|-----|
| **Semantic** (default) | "find similar to X" | Embedding vector similarity via Vectra. Returns results ranked by cosine similarity. Falls back to BM25 if embedding model unavailable. |
| **BM25 keyword** | "find all entries tagged `security`" | Full-text search via Vectra's built-in BM25. Tokenized, stemmed, ranked. Always available. |
| **Hybrid** (best) | Default search | BM25 pre-filters by metadata (type, tags, layer), vector similarity re-ranks by semantic closeness. Best of both. |
| **Backlinks** | "what links to this entry?" | Parse `related` frontmatter arrays from all `.md` files. Inverse index maintained in Vectra metadata. |

### Eviction policy

When `max_entries` reached, evict by priority:

1. `evolution_event` (oldest) — least compound value
2. `success_pattern` (oldest)
3. `decision` (oldest)
4. `failure_pattern` — **never evicted** (failures compound most)

Eviction removes the `.md` file from `wiki/` and updates Vectra index.

### Archon integration

Archon's persistent run history (SQLite/PostgreSQL) complements the wiki. Archon tracks workflow runs and session state. The wiki stores domain-specific patterns and decisions with cross-references. The `capture-memory` Archon node ensures final results are stored as `.md` entries in `wiki/`.

## API surface: `lib/wiki-kb.ts`

Replaces `lib/harness-knowledge-base.ts` (ADR-007). Same capabilities, backed by `wiki/` directory.

```typescript
class WikiKnowledgeBase {
  private wikiPath: string;        // wiki/ directory
  private vectraIndex: LocalIndex; // .pi/wiki-search/vectra-index/
  private embeddingModel: any;     // @huggingface/transformers model (lazy-loaded)

  constructor(wikiPath?: string);   // default: <project-root>/wiki/

  // Lifecycle
  initialize(): Promise<void>;     // Load Vectra index, optionally load embedding model
  shutdown(): Promise<void>;       // Persist Vectra index

  // Write — creates .md file in wiki/ + updates Vectra index
  store(entry: WikiEntry): Promise<string>;
  update(id: string, patch: Partial<WikiEntry>): Promise<void>;
  delete(id: string): Promise<void>;

  // Read — from .md file (always) + Vectra (for search)
  retrieve(id: string): Promise<WikiEntry | null>;

  // Search — hybrid BM25 + vector by default
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  // Pattern-specific
  storeSuccessPattern(context: string, content: any, tags: string[]): Promise<string>;
  storeFailurePattern(context: string, content: any, tags: string[]): Promise<string>;
  storeDecision(context: string, decision: string, rationale: string, alternatives: string[]): Promise<string>;
  recordEvolution(event: string, files_changed: string[]): Promise<string>;

  // Cross-references
  backlinks(id: string): Promise<WikiEntry[]>;
  related(id: string, limit?: number): Promise<SearchResult[]>;

  // Retrieval helpers (use Vectra metadata filtering)
  findSimilarPatterns(currentContext: string, limit?: number): Promise<SearchResult[]>;
  getRecentDecisions(count?: number): Promise<WikiEntry[]>;
  getFailurePatternsFor(tags: string[]): Promise<WikiEntry[]>;

  // Index management
  reindex(): Promise<void>;       // Rebuild Vectra index from all wiki/*.md
  status(): Promise<IndexStatus>;
}
```

See `wiki/layers/08-wiki-query-interface.md` for full type definitions including `SearchOptions` and `IndexStatus`.

### Embedding model lifecycle

```
initialize():
  1. Load Vectra index from .pi/wiki-search/vectra-index/
  2. Check if embedding model is cached in .pi/wiki-search/model-cache/
  3. If cached: load model (~200ms)
  4. If not cached: skip semantic search, use BM25-only
     (model downloads lazily on first semantic search call)
  5. On first semantic search:
     a. Download model to .pi/wiki-search/model-cache/ (~80MB, 10-30 seconds)
     b. Generate embeddings for all existing entries in wiki/
     c. Store embeddings in Vectra index
     d. Resume hybrid search

semantic search with model unavailable:
  → Fall back to BM25 keyword search
  → Log: "Semantic search unavailable (model not downloaded). Using keyword search."
  → Do not block execution
```

## Extension: `extensions/harness-knowledge-base.ts`

Uses `WikiKnowledgeBase` (from `lib/wiki-kb.ts`) instead of `HarnessKnowledgeBase`. Reads/writes to `wiki/` instead of `.pi/harness/knowledge-base/`. Also provides access to `wiki` CLI.

| Type | Name | Description |
|------|------|-------------|
| Event consumed | `session_start` | Initialize WikiKnowledgeBase, load config |
| Event consumed | `session_shutdown` | Persist Vectra index, flush writes |
| Event consumed | `turn_end` | Auto-capture decision rationale |
| Event emitted | `knowledge_base_updated` | `{ entry_id, type }` — informational |
| Tool | `harness-search` | Semantic/keyword search via WikiKnowledgeBase |
| Tool | `harness-kb-store` | Explicitly store a pattern/decision to wiki/ |
| Tool | `harness-kb-retrieve` | Retrieve wiki entry by ID |
| Command | `/harness-kb-status` | Entry counts, search index status, embedding model status |

Agent skill `.pi/skills/wiki/SKILL.md` provides CLI-based access to the same operations.

## Config (tuning only — layer always runs)

```json
{
  "memory": {
    "max_entries": 10000,
    "embedding_model": "all-MiniLM-L6-v2",
    "search_mode": "hybrid",
    "wiki_path": "wiki"
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `max_entries` | 10000 | Max entries before eviction. Failure patterns never evicted |
| `embedding_model` | "all-MiniLM-L6-v2" | HuggingFace model ID for embeddings. Downloaded once and cached |
| `search_mode` | "hybrid" | "hybrid" (BM25 + vector), "bm25" (keyword only), "vector" (semantic only) |
| `wiki_path` | "wiki" | Path to wiki directory relative to project root |

## Error states

| Error | Recovery |
|-------|----------|
| `embedding_model_unavailable` | Fall back to BM25-only search; log info; do not block |
| `embedding_download_failed` | Skip semantic search permanently for session; log warning |
| `wiki_write_failure` | Fall back to in-memory; log error |
| `vectra_index_corruption` | `wiki reindex` rebuilds from `wiki/*.md`; ~2-30 seconds |
| `wiki_full` (max_entries reached) | Evict by priority (evolution → success → decision → never failure) |

## Token cost

Writes: ~200 tokens + ~50ms embedding compute. Reads: ~200 tokens. Search: ~200 tokens.

## New dependencies

| Package | Size | Purpose |
|---------|------|---------|
| `vectra` | ~1.8MB | Local vector database with BM25 + hybrid search |
| `@huggingface/transformers` | ~5MB core | Local embedding model runtime (ONNX) |
| Model: `all-MiniLM-L6-v2` | ~80MB (one-time) | 384-dim sentence embeddings |
| `commander` | ~200KB | CLI argument parsing for `wiki` command |
| `nanoid` | ~5KB | ID generation for runtime entries |

Total added: ~7MB packages + ~80MB model cached in `.pi/wiki-search/model-cache/`.

`.pi/wiki-search/` should be in `.gitignore` (regenerable index).
`wiki/` markdown files should be committed (project-specific knowledge).

See `wiki/layers/08-wiki-query-interface.md` for full CLI and skill specs.