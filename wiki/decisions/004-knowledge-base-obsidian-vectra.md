# ADR-004: Knowledge Base — Obsidian Vault + Vectra Semantic Search (SUPERSEDED)

> **This ADR is superseded by ADR-007** (`wiki/decisions/ADR-007-wiki-as-knowledge-base.md`).
>
> ADR-004 specified a separate Obsidian vault at `.pi/harness/knowledge-base/`. This created a dual knowledge store problem. ADR-007 merges the knowledge base into the project `wiki/` directory — single source of truth, git-tracked, PR-reviewed, semantically searchable via the same Vectra engine.

---

## Context

ADR-003 specified JSONL + in-memory indexes for the memory layer. This is a flat file hack — not a knowledge base. The harness needs:

1. **Human-readable, browsable knowledge** — engineers should be able to open the knowledge base and read it
2. **Cross-referenced entries** — success patterns link to the decisions that informed them, failed approaches link to the failures that resulted
3. **Semantic search** — "find patterns related to authentication bugs" should match entries about "login security issues" even without exact keyword overlap
4. **Graph visualization** — seeing how entries connect helps the agent and the human operator
5. **Zero-friction tooling** — the knowledge base should open in existing editors without setup

## Decision

**Use an Obsidian-compatible vault as the knowledge base format, backed by Vectra for semantic search.**

### What this means

| Component | Technology | Why |
|-----------|-----------|-----|
| Knowledge base format | Obsidian-compatible Markdown vault | Just a folder of `.md` files. Human-readable, inspectable, debuggable. Open in Obsidian for graph view, or VS Code, or any editor. Wikilinks for cross-references. Frontmatter for structured metadata. |
| Semantic search | Vectra (local, file-backed vector DB) | Pure TypeScript, no external services, hybrid BM25 + vector search, Pinecone-compatible API. 1.8MB package. |
| Embeddings | `@huggingface/transformers` (ONNX runtime) | Local embedding model (`all-MiniLM-L6-v2`, 384 dims, ~80MB one-time download). No API calls. Runs in Node.js natively. Falls back to BM25-only if model unavailable. |
| Full-text search | Vectra's built-in BM25 (wink-nlp) | Always available, no model download needed. Handles keyword and phrase matching. |
| Structured queries | Frontmatter YAML in each `.md` file | Type, tags, layer_provenance, timestamp — queryable by Vectra's metadata filtering. |

### Why this beats ADR-003 (JSONL + in-memory index)

| Requirement | ADR-003 (JSONL) | ADR-004 (Obsidian + Vectra) |
|-------------|-----------------|------------------------------|
| Human readability | Must parse JSONL | Open `.md` file in any editor |
| Cross-referencing | Manually join on IDs | Wikilinks `[[entry-id]]` render as clickable links in Obsidian |
| Semantic search | Not possible (keyword only) | Vectra hybrid BM25 + vector similarity |
| Graph visualization | Not possible | Obsidian graph view shows connections between entries |
| Inspection/debugging | `cat entries.jsonl \| jq` | Open the vault in VS Code or Obsidian |
| Browsing | Custom tool or raw file | Obsidian's file explorer, backlinks, tags, graph |
| Embargo/sensitive entries | Not possible | Obsidian supports per-file properties; `.md` files are gitignore-able |
| Token-efficient retrieval | O(k) tag index, O(n) text scan | Vectra indexes with metadata filtering + BM25 pre-filter + vector re-rank |
| Zero native deps | ✅ | ✅ (Vectra is pure TS, transformers.js is WASM) |

### Vault structure

```
.pi/harness/knowledge-base/
  _templates/
    success-pattern.md
    failure-pattern.md
    decision.md
    evolution-event.md
    spec.md
    plan.md
    checkpoint.md
    review.md
  patterns/
    success/
      SP-<id>.md
    failure/
      FP-<id>.md
  decisions/
      DEC-<id>.md
  evolution/
      EV-<id>.md
  specs/
      SPEC-<id>.md
  plans/
      PLAN-<id>.md
  checkpoints/
      CP-<id>.md
  reviews/
      REV-<id>.md
  .search/
    vectra-index/                  # Vectra local index files
    model-config.json              # embedding model metadata
    embedding-cache/               # cached embeddings (optional)
```

### Entry format (example: success pattern)

```markdown
---
id: SP-a1b2c3d4
type: success_pattern
tags: [auth, api, security, login]
created: 2026-04-27T21:00:00Z
layer: Layer_4
status: active
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
- [[DEC-x7y8z9|Decision: Use JWT for authentication]]
- [[FP-m4n5o6|Failure: Previous auth attempt missed issuer check]]
- [[SPEC-j2k3l4|Spec: User authentication module]]
```

### Search architecture

**Two-tier search:**

1. **Tier 1: BM25 (always available, zero setup)**
   - Vectra's built-in BM25 uses wink-nlp for tokenization
   - Matches on keywords, tags, frontmatter fields
   - Good for: "find all entries tagged `security`", "find decisions about authentication"

2. **Tier 2: Vector similarity (available after model download)**
   - `@huggingface/transformers` generates 384-dim embeddings from entry content
   - Vectra stores vectors alongside documents
   - Good for: "find entries semantically similar to this authentication approach"
   - Falls back to BM25-only if model is not downloaded

**Hybrid search (default):**
- Vectra combines BM25 + vector similarity
- BM25 pre-filters by metadata (type, tags, layer)
- Vector similarity re-ranks results by semantic closeness
- Best of both: structure-aware + meaning-aware

### Embedding model

- **Primary:** `Xenova/all-MiniLM-L6-v2` (384 dimensions, ~80MB)
  - Good quality/size tradeoff
  - Runs in Node.js via ONNX runtime (no Python, no GPU needed)
  - ~50ms per embedding on CPU (acceptable for write-once, read-many)
  - Downloaded once, cached in `.search/model-cache/`
- **Fallback:** BM25-only search if model download fails or is skipped
- **Config:** `memory.embedding_model: "all-MiniLM-L6-v2"` (changeable to any supported model)

### Obsidian compatibility

The vault is **Obsidian-compatible**, not Obsidian-required:
- Users can open `.pi/harness/knowledge-base/` in Obsidian to get graph view, backlinks, tags
- Users can browse in VS Code, any Markdown editor, or `cat` from terminal
- The harness reads/writes `.md` files directly via Node.js `fs` module
- Wikilinks `[[entry-id|display text]]` are parsed by the harness for cross-reference resolution
- The harness does NOT require Obsidian to be installed or running

### How the harness writes entries

```typescript
// When Layer 6 stores a success pattern:
await knowledgeBase.store({
  type: "success_pattern",
  content: {
    problem: "JWT issuer check missing",
    approach: "Added iss validation",
    outcome: "All critics passed",
  },
  tags: ["auth", "security"],
  related: ["DEC-x7y8z9", "FP-m4n5o6", "SPEC-j2k3l4"],
});
// This creates:
//   patterns/success/SP-a1b2c3d4.md  (the Obsidian note)
//   .search/vectra-index/...          (the search index)
```

### How the harness reads entries

```typescript
// Semantic search: "find patterns similar to authentication issues"
const results = await knowledgeBase.search("authentication bypass token replay", {
  type: "success_pattern",
  tags: ["security"],
  limit: 5,
  useVectors: true,  // falls back to BM25 if embeddings unavailable
});

// Direct retrieval by ID
const entry = await knowledgeBase.retrieve("SP-a1b2c3d4");

// Get all entries linking to this one (backlinks)
const backlinks = await knowledgeBase.backlinks("SP-a1b2c3d4");
```

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| JSONL + in-memory index (ADR-003) | Not human-readable, no semantic search, no graph view, flat file hack |
| SQLite + FTS5 (original ADR-002 design) | Native dep, not human-readable, no semantic search, binary format |
| ChromaDB | Requires Python server running separately. Not seamless for a Node.js pi.dev extension. |
| Qdrant | Requires separate service deployment. Overkill for single-workstation. |
| Logseq | Also Markdown-based but with a more complex format (org-mode style). Obsidian's pure Markdown + frontmatter is simpler to parse/write. |
| Notion | Proprietary, closed, requires API key, not local-first. |
| Plain Markdown files (no Vectra) | No semantic search. BM25-only is keyword-limited — "fix security bug" won't match "resolve authentication vulnerability". |
|_vectra alone (no Obsidian format)_ | Vectra's document format is internal. Writing `.md` files gives human readability AND searchability. |

## Consequences

**Superseded by ADR-007.** The Obsidian vault approach is replaced by using the project `wiki/` directory directly.

Original consequences (for reference):
- Knowledge base is human-browsable in Obsidian, VS Code, or any Markdown editor
- Semantic search enables "find me similar patterns" queries that keyword search can't do
- Vectra adds ~1.8MB to `node_modules` (pure TypeScript, no native deps)
- Embedding model adds ~80MB one-time download (cached, optional)
- Search performance: BM25 pre-filter + vector re-rank = ~5ms for 10k entries
- Entry creation: ~50ms (embedding computation) + ~5ms (Vectra index write)
- The `@huggingface/transformers` model download on first use may take 10-30 seconds; harness should handle this gracefully with a loading indicator
- Vault size grows proportionally with entries (each `.md` file is ~1-5KB); 10k entries ≈ 30-50MB
- Git: `.search/` and `model-cache/` should be in `.gitignore` (regenerable); `.md` files should be committed (knowledge base is project-specific)

**What ADR-007 changes:**
- Vault path changes from `.pi/harness/knowledge-base/` to `wiki/`
- Wikilinks replaced with standard markdown links
- A custom CLI (`wiki` command) provides query interface
- Agent skill wrapper (`.pi/skills/wiki/`) replaces direct extension tool calls
- Search index moves to `.pi/wiki-search/`
- `HarnessKnowledgeBase` class replaced by `WikiKnowledgeBase`
- No Obsidian dependency — standard markdown only