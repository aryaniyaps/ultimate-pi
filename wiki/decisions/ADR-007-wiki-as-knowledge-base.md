# ADR-007: Wiki as Knowledge Base — Replaces Obsidian Vault

**Date:** 2026-04-28
**Status:** Accepted
**Supersedes:** ADR-004 (`wiki/decisions/004-knowledge-base-obsidian-vectra.md`)

## Context

ADR-004 specified a separate Obsidian-compatible vault at `.pi/harness/knowledge-base/` with Vectra semantic search. This creates a **dual knowledge store** problem:

1. `wiki/` already holds design decisions (ADRs), layer specs, and the implementation plan — the architectural knowledge of the system
2. `.pi/harness/knowledge-base/` would hold runtime patterns, failure modes, decisions captured during execution
3. These two stores overlap heavily (decisions exist in both) and diverge easily (no sync mechanism)
4. Agents must query two different locations to get full context
5. The Obsidian vault format adds wikilink syntax complexity with no real benefit — agents don't use Obsidian graph view
6. Separating design knowledge from runtime knowledge is artificial — a failure pattern discovered during execution IS architectural knowledge

The project needs a **single, centralized, semantically searchable wiki** that holds everything and is accessible from any device via git.

## Decision

**Merge the knowledge base into the project wiki.** The `wiki/` directory IS the knowledge base. No separate Obsidian vault.

### Architecture

| Component | Technology | Why |
|-----------|-----------|-----|
| Knowledge store | `wiki/` directory (git-tracked markdown) | Single source of truth. Already exists. Git = sync across devices. PR review = consistency enforcement. |
| Semantic search | Vectra (local, file-backed vector DB) | Same as ADR-004. Hybrid BM25 + vector. Pure TypeScript. No external services. |
| Embeddings | `@huggingface/transformers` (local ONNX) | Same as ADR-004. `all-MiniLM-L6-v2`, 384 dims, ~80MB one-time download. |
| Query interface | Custom CLI (`wiki` command) | Agent-friendly. Structured output. Pipes into other tools. |
| Agent interface | Skill wrapper (`.pi/skills/wiki/`) | Agents invoke CLI via skill instructions. No API server needed. |
| Search index | `.pi/wiki-search/` (gitignored, rebuildable) | Vectra index + embedding cache. Rebuilt from markdown on `git pull`. |

### Wiki directory structure

```
wiki/
  decisions/          # ADRs (existing) — architectural decisions
  layers/             # Layer specs (existing) — harness documentation
  patterns/           # NEW — runtime patterns from harness execution
    success/          #   SP-<id>.md — what worked
    failure/          #   FP-<id>.md — what didn't
  specs/              # NEW — hardened specifications
  plans/              # NEW — execution plans
  checkpoints/        # NEW — grounding checkpoints
  reviews/            # NEW — critic reviews
  evolution/          # NEW — codebase evolution events
  harness-implementation-plan.md  # (existing)
```

Every entry is a markdown file with YAML frontmatter. No wikilink syntax — use standard markdown links `[text](path)` or just reference IDs in frontmatter `related: [SP-abc, DEC-xyz]`.

### Why this beats ADR-004 (separate Obsidian vault)

| Concern | ADR-004 (Obsidian vault) | ADR-007 (wiki as knowledge base) |
|---------|--------------------------|----------------------------------|
| Single source of truth | ❌ Two stores: `wiki/` + `.pi/harness/knowledge-base/` | ✅ One store: `wiki/` |
| Git-tracked | ⚠️ `.md` files yes, but hidden in `.pi/` | ✅ `wiki/` is first-class project dir |
| PR review on entries | ⚠️ `.pi/` changes often auto-committed | ✅ `wiki/` changes go through PR review |
| Cross-device sync | ⚠️ Two dirs to sync | ✅ One dir, `git pull` |
| Agent discoverability | ❌ Must know about `.pi/harness/knowledge-base/` | ✅ `wiki/` is visible, obvious |
| Obsidian dependency | ⚠️ Wikilink syntax needed for graph view | ✅ Standard markdown, no special syntax |
| Human browsing | ⚠️ Hidden path, need Obsidian | ✅ Open `wiki/` in any editor, browse on GitHub |
| Runtime + design knowledge | ❌ Split across two locations | ✅ Co-located, semantically linked |

### Entry format

Each wiki entry (decision, pattern, spec, etc.) is markdown with YAML frontmatter:

```markdown
---
id: SP-a1b2c3d4
type: success_pattern
tags: [auth, api, security]
created: 2026-04-28T10:00:00Z
layer: Layer_4
related: [DEC-x7y8z9, FP-m4n5o6]
---

# Success Pattern: Authentication bypass fix

## Problem
JWT token validation was missing issuer check.

## Approach
Added `iss` claim validation to JWT middleware.

## Outcome
Passed all 4 critic focus areas.

## Related
- [Decision: Use JWT](decisions/DEC-x7y8z9.md)
- [Failure: Previous attempt](patterns/failure/FP-m4n5o6.md)
```

### Wiki CLI

A custom CLI tool (`wiki`) provides structured access to the wiki. See `wiki/layers/08-wiki-query-interface.md` for full spec.

```bash
wiki search "authentication patterns"           # semantic search
wiki search "auth" --type decision              # filtered search
wiki search "security" --tags auth,jwt          # tag-filtered
wiki get ADR-007                                # retrieve by ID
wiki list --type failure_pattern                # list by type
wiki add pattern success "Fix auth bypass"      # add entry interactively
wiki related ADR-007                            # semantically similar
wiki backlinks ADR-007                          # entries that reference this
wiki status                                     # index health, entry counts
wiki reindex                                    # rebuild vector index
```

### Agent skill wrapper

`.pi/skills/wiki/SKILL.md` tells agents how to use the wiki CLI. Agents run `wiki search`, `wiki get`, etc. via shell. No API server. No extra runtime.

### Search index lifecycle

```
git pull → wiki reindex (auto or manual) → Vectra rebuilds from wiki/*.md
```

Index stored in `.pi/wiki-search/` (gitignored). Rebuildable in ~2s for <500 docs. Embedding model cached in `.pi/wiki-search/model-cache/`.

### Harness integration (Layer 6)

Layer 6 (Persistent Memory) reads/writes to `wiki/` instead of `.pi/harness/knowledge-base/`. The `HarnessKnowledgeBase` class is replaced by `WikiKnowledgeBase` which:
- Writes entries to `wiki/patterns/`, `wiki/specs/`, etc.
- Reads via the wiki CLI
- The pi.dev extension calls the same `wiki` CLI under the hood

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| ADR-004 (Obsidian vault in `.pi/harness/knowledge-base/`) | Dual store problem. Hidden from humans. Wikilinks are Obsidian-specific. |
| GitHub Wiki | Separate git repo. No PR review. No semantic search. API rate limits. Slow for agents. |
| Notion/Confluence | Proprietary, cloud-only, not local-first. |
| ChromaDB server | Requires Python runtime. Overkill for single workstation. |
| SQLite + FTS5 | Binary, not human-readable, no semantic search. |

## Consequences

- Single knowledge store: `wiki/` — design decisions AND runtime patterns in one place
- Git-tracked: every wiki change is reviewable, revertable, syncable across devices
- Agents use `wiki` CLI via skill — no API server, no extra process
- Vectra index is gitignored and rebuildable — no merge conflicts on search data
- `.pi/harness/knowledge-base/` directory no longer needed
- ADR-004 superseded — its Obsidian vault format is abandoned
- Obsidian graph view is lost — but agents don't use it, and humans can use any markdown tool
- Wiki PR review becomes mandatory for consistency — design decisions require human approval
