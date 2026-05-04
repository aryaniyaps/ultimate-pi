---
name: ck-search
description: "Semantic code search using ck. Use when exploring codebases, finding related code, or searching by concept rather than exact text. Triggers on: search for, find code that, where is, look for patterns, find all files related to, find similar code, explore codebase, semantic search."
---

# ck-search: Semantic Code Search

## When to Use

Use `ck` instead of `grep`/`find` for **any codebase exploration**. Reserve raw grep for only: exact literal string match (specific error message, exact function name).

## Quick Reference

```bash
# Hybrid (best default — lexical + semantic fused via RRF)
ck --hybrid "query" .

# Semantic only (conceptual — finds by meaning)
ck --sem "concept" src/

# Lexical BM25 (phrase-based, better than grep for multi-word)
ck --lex "phrase" .

# Grep-compatible (exact match, same flags as grep)
ck "exact string" -rn src/
```

## Search Decision Tree

```
Agent needs to find code
  ├─ Exact literal string (error msg, function name) → grep/rg
  ├─ Conceptual / multi-word → ck --hybrid
  ├─ Find similar patterns → ck --sem
  └─ Unsure → ck --hybrid (safe default)
```

## Key Flags

| Flag | Purpose | When |
|------|---------|------|
| `--hybrid` | BM25 + semantic RRF fusion | **Default for exploration** |
| `--sem` | Semantic only (embedding similarity) | Conceptual: "error handling", "auth flow" |
| `--lex` | BM25 lexical only | Phrase search without regex |
| `--limit N` | Top N results | Keep output lean (default 10) |
| `--threshold 0.7` | Min similarity score | Filter low-confidence results |
| `--json` | Machine-readable output | When piping to other tools |
| `-n` | Line numbers | Same as grep |
| `-C N` | Context lines | Same as grep |
| `-r` | Recursive | Same as grep |
| `-l` | Files with matches | List matching files only |

## Index Management

```bash
ck --status .              # Check if index exists
ck index .                 # Build/rebuild full index
ck --add file.ts           # Add single file to index
ck --clean .               # Remove index (rebuild from scratch)
ck --switch-model MODEL    # Rebuild with different embedding model
```

## Usage Patterns

### Find related code
```bash
ck --hybrid "retry logic with exponential backoff" .
```

### Find authentication code
```bash
ck --sem "authentication middleware" src/ --limit 20
```

### Find error handling patterns
```bash
ck --hybrid "error handling and recovery" src/ --limit 15
```

### Find database code
```bash
ck --sem "database connection pool" src/
```

### Exact function name (still use grep)
```bash
grep -rn "processPayment" src/
```

## Integration Notes

- **Index location**: `.ck/index/` in project root (gitignored)
- **First search auto-indexes**: `ck --sem` builds index on first run if missing
- **Fully offline**: No API keys, no network, embeddings run locally
- **MCP mode**: `ck --serve` exposes ck_search/ck_get/ck_info/ck_reindex as MCP tools (future integration)

## Token Efficiency

ck results are ranked and scored. Use `--limit` to cap output. A typical ck --hybrid call returns 10 results (~500-1000 tokens) vs raw grep which can return hundreds of unranked matches (~5000-20000 tokens).
