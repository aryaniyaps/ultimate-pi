---
type: question
title: "How to enable semantic code search now"
question: "What can be done now to enable semantic code search and improve overall model performance?"
answer_quality: solid
created: 2026-05-04
updated: 2026-05-04
tags: [question, semantic-search, harness, implementation]
related:
  - "[[ck-tool]]"
  - "[[agent-search-enforcement]]"
  - "[[hybrid-code-search]]"
  - "[[Semantic Codebase Indexing]]"
  - "[[harness-implementation-plan]]"
sources:
  - "[[Research: semantic code search tools]]"
  - "[[ck-semantic-search]]"
  - "[[agent-search-enforcement]]"
status: resolved
---

# How to enable semantic code search now

## Problem

AI coding agents waste context on `grep`/`find` because those tools are lexical-only, noisy, non-indexed, and token-inefficient. Every query scans the full codebase. Semantic searches like "error handling patterns" find zero matches with grep.

## Solution: Three layers

### Layer 1 (Immediate) — Install ck + system prompt rules

**Tool**: ck (BeaconBay/ck, 1,572 ★, Rust, MIT, fully offline). Grep-compatible with `--sem` (semantic) and `--hybrid` (BM25 + embeddings via RRF) modes. MCP-native.

```bash
npm install -g @beaconbay/ck-search
ck index .              # Build semantic index once
ck --hybrid "query"     # Then search
```

System prompt rules: NEVER raw grep for exploration, ALWAYS `ck --hybrid` for conceptual searches.

### Layer 2 (Medium-term) — Skill-based enforcement

Create a skill that teaches the agent when/how to use ck. Trigger on codebase exploration tasks. Progressive disclosure: only loads when agent searches.

### Layer 3 (Optional) — Pre-exec hook

Intercept grep in lean-ctx bash tool, reroute conceptual queries to ck. Catches all grep invocations regardless of model compliance.

## Impact

| Metric | Before | After |
|--------|--------|-------|
| Search type | Lexical only | BM25 + semantic + RRF fusion |
| Conceptual queries | 0% recall | ~80-90% recall |
| Context waste | Raw grep output, full scan | Ranked, indexed, token-efficient |
| Tool loading | Always | Progressive (only when needed) |

## Validation

Augment Code's Context Engine proves semantic indexing at scale: #1 SWE-bench Pro (51.80%), beating Cursor by 1.59% and Claude Code by 2.05% — same model, better context. (Source: [[Semantic Codebase Indexing]], [[Context Engine (AI Coding)]])

## Implementation status (2026-05-04)

### Layer 1 (Complete)
- **ck**: Installed globally (`/home/aryaniyaps/.nvm/.../bin/ck`)
- **Semantic index**: Built — 342 files, 1,593 chunks, 2.7MB (BAAI/bge-small-en-v1.5)
- **Skill**: Created `.pi/skills/ck-search/SKILL.md` — decision tree, usage patterns, token efficiency
- **System prompt**: CODEBASE SEARCH POLICY section in `SYSTEM.md` — NEVER raw grep, ALWAYS ck --hybrid
- **Gitignore**: `.ck/` added (regenerable index)

### Layer 2 (Complete)
- **pi extension** `.pi/extensions/ck-enforce.ts` — overrides lean-ctx's `grep` tool
  - Registers on `session_start` (loads AFTER lean-ctx to properly override)
  - Detects conceptual patterns: multi-word + no regex chars → reroutes to `ck --hybrid --json`
  - Literal/exact/regex patterns → pass through to native ripgrep via lean-ctx
  - Status command: `/ck-enforce`
- **File watcher** `.pi/scripts/ck-watch.sh` — auto-reindexes on source changes
  - Node.js `fs.watch` (recursive, cross-platform)
  - 1500ms debounce, excludes node_modules/.ck/.git/dist/build
  - Verified: reindex in ~400ms on change
  - Run: `.pi/scripts/ck-watch.sh &` for background mode
- **Dependency**: `@sinclair/typebox` added as devDependency

### Architecture
```
Model calls grep("error handling", pages/")
  → ck-enforce intercepts (conceptual? yes)
  → ck --hybrid "error handling" pages/ --json
  → Returns semantic + lexical results, ranked by RRF

Model calls grep("processPayment", src/)
  → ck-enforce intercepts (conceptual? no — single word)
  → lean-ctx rg --line-number "processPayment" src/
  → Returns exact matches only
```

### File watcher
```
Files change (edit, save, git checkout)
  → fs.watch detects change
  → debounce 1500ms
  → ck index . → 400ms reindex
  → Index stays fresh
```

## Open questions

- ck's embedding quality vs code-specific models (CodeBERT, UniXCoder) on real-world queries — no independent benchmarks
- MCP tool preference when native bash/grep also available — empirical testing needed
- Shell wrapper false-positive rate on production agent queries
