---
type: resolution
title: "Resolved: Context Window Economics — Token Allocation, Monorepos, and Caching"
created: 2026-04-30
updated: 2026-04-30
tags:
  - resolution
  - context-window
  - token-economics
  - repo-map
  - caching
status: resolved
resolves:
  - "[[research-agent-first-codebase-exploration]] Open Questions #2-5"
  - "[[research-gitingest-gitreverse-integration]] Open Questions #1-4"
  - "[[Research: semantic code search tools]] Open Question #1, #5"
related:
  - "[[research-agent-first-codebase-exploration]]"
  - "[[research-gitingest-gitreverse-integration]]"
  - "[[progressive-disclosure-agents]]"
  - "[[repo-map-ranking]]"
  - "[[gitingest]]"
sources:
  - "[[claude-context-editing-docs]]"
  - "[[gitingest]]"
---

# Resolved: Context Window Economics

## Resolution

**Token allocation is model- and task-specific but follows a consistent pattern: 10-20% repo map, 40-60% file contents, 20-40% conversation history. Monorepos require project-level splitting with progressive disclosure. Pre-computed and cached repo maps are the primary optimization — embeddings are secondary. The agent decides context expansion (L0→L1→L2) based on task needs, guided by explicit query interfaces at each level.**

## 1. Token Allocation Model

### Default Allocation by Task Type

| Task Type | Repo Map | File Contents | Conversation | Example |
|-----------|----------|---------------|--------------|---------|
| **Bug fix (localized)** | 10% | 30% | 60% | Fix known function, need history + current file |
| **Feature addition** | 20% | 50% | 30% | Need architecture context + relevant files |
| **Codebase exploration** | 40% | 50% | 10% | Understanding new codebase, minimal history |
| **Refactoring** | 30% | 40% | 30% | Need broad context + implementation details |
| **Code review** | 15% | 60% | 25% | Need changed files + spec context |

### Allocation for Common Context Windows

| Context Window | Repo Map | File Contents | Conversation | Total Usable |
|---------------|----------|---------------|--------------|-------------|
| **32k (small)** | 3-6k | 13-19k | 6-13k | 32k |
| **100k (medium)** | 10-20k | 40-60k | 20-40k | 100k |
| **200k (large)** | 20-40k | 80-120k | 40-80k | 200k |

**The 10-20-40 rule**: repo map ≤20% of window, conversation ≤40%, file contents fill remainder. This ensures the agent always has structural context (map) and task continuity (conversation) while maximizing code visibility.

## 2. Monorepo Handling

### Problem

Single repo maps for monorepos exceed context windows. A monorepo with 50 projects, each with 10k LOC, produces a repo map of 100k+ tokens — exceeding all but the largest context windows.

### Solution: Hierarchical Repo Maps

```
L0: Project-Level Map (always injected, ~2-5k tokens)
  ├─ List of sub-projects with one-line descriptions
  ├─ Cross-project dependency graph (edges only, no details)
  └─ Entry points and API surfaces per project

L1: Sub-Project Map (queryable, ~5-15k tokens)
  ├─ Full symbol map for one sub-project
  ├─ Internal dependency graph
  └─ Call graph within the sub-project

L2: File-Level Context (on-demand, variable)
  ├─ Full file contents
  ├─ Function bodies
  └─ Deep context for specific symbols
```

The L0 map is always injected. The agent queries L1 for the relevant sub-project(s). L2 is loaded on demand for specific files.

### Gitingest for Monorepos

Gitingest handles large repos via:
- `--include` / `--exclude` patterns to filter sub-projects
- `--max-size` to limit individual file sizes
- `--branch` to target specific branches

For monorepos, use Gitingest per sub-project: `gitingest <url> --include "src/auth/**"` for the auth module only. This keeps output within context window limits. (Source: [[gitingest]])

## 3. Pre-Computation and Caching

### What to Pre-Compute

| Artifact | Compute Cost | Cache Strategy | Refresh Trigger |
|----------|-------------|----------------|-----------------|
| **Tree-sitter repo map** | ~1-5s per 100k LOC | File cache (`.pi/cache/repo-map.json`) | Git diff on session start |
| **Dependency graph** | ~0.5-2s per project | File cache (`.pi/cache/dep-graph.json`) | File changes in imports |
| **Code embeddings** | ~30-300s per 100k LOC | Vector DB (ck index) | File changes (incremental) |
| **Test impact map** | Build-system dependent | File cache | Test file changes |

### Caching Architecture

```
Session Start:
  1. Load cached repo map from .pi/cache/repo-map.json
  2. Git diff against cache timestamp
  3. Re-parse only changed files (incremental update)
  4. Inject updated L0 map into agent context

Cost: ~0.1-1s vs 5-30s for full re-parse
```

### Embedding-Based Retrieval

Code embeddings (ck, vgrep) are complementary to repo maps:
- **Repo map**: Structural understanding (what exists, how it connects). Deterministic.
- **Embeddings**: Semantic search (find code by meaning). Probabilistic, ranked.

Embeddings should be pre-computed and incrementally updated, not built on every session. ck's default embedding model (fastembed) is adequate for code search but not competitive with code-specific models (CodeBERT, UniXCoder) — the gap is real but the cost/simplicity tradeoff favors ck for agent use.

## 4. Context Expansion Decision (L0→L1→L2)

### How the Agent Decides

The agent determines context expansion based on task requirements, not a fixed heuristic:

| Expansion Trigger | Agent Action | Tool Support Needed |
|-------------------|-------------|-------------------|
| "I need to understand function X" | Query L1: symbol details for X | `symbol_info("function_name")` |
| "I need to see all callers of X" | Query L1: call graph for X | `callers("function_name")` |
| "I need to modify file Y" | Load L2: full file contents | `read_file("path")` |
| "I need type information for Z" | Query L2: type definition | `type_info("ClassName")` |
| "I'm lost, need more context" | Drift detection should trigger | Meta-agent nudges agent |

The tooling at each level must support explicit queries. The agent should not have to "figure out" what's available — the progressive disclosure API makes each level explicitly queryable.

### When NOT to Expand

- **Confidence is high**: Agent has enough context for the current subtask
- **Token budget is tight**: Expansion would push out critical conversation history
- **Information is available in current context**: The answer is already in the repo map or loaded files
- **Task is narrowly scoped**: Bug fix in a single function doesn't need project-level context

The agent should default to working with what it has. Only expand when explicitly needed.

## 5. Remaining Gitingest Questions

### Gitingest repo-level truncation

Gitingest supports `--max-size` for individual files but repo-level truncation behavior is not explicitly documented. Based on the codebase, Gitingest processes all files matching include/exclude patterns and concatenates them. If the total exceeds practical limits, the user must pre-filter with include/exclude patterns. This is adequate for the harness use case — the agent should use per-sub-project Gitingest with include patterns.

### Gitingest + lean-ctx AST compression

Yes, Gitingest output can be further compressed by lean-ctx tree-sitter AST mode. Gitingest produces full file contents; lean-ctx can truncate function bodies. The pipeline: `gitingest <url> → raw output → lean-ctx AST truncation → agent context`. This is complementary but the AST truncation needs to handle the Gitingest output format (delimited files).

### Repomix evaluation

Repomix is the npm ecosystem equivalent of Gitingest. Both convert repos to LLM-ready text. Gitingest (Python) is preferred for the harness since the project already has Python dependencies. Repomix should be evaluated only if npm-native integration is needed. Not a priority.

### GitHub API rate limits for Gitingest

Gitingest fetches repos via git clone (for local use) or GitHub API (for web service). The web service may cache popular repos. For the harness, use the local Python package (`pip install gitingest`) which clones via git — no API rate limit concern. Only the web service (`gitingest.com`) has rate limits.

## Confidence

**High** for token allocation model and monorepo handling (based on production patterns from Claude, OpenCode, and aider). **Medium** for Gitingest truncation behavior (inferred from code, not explicitly documented). **High** for caching architecture (standard incremental update pattern).
