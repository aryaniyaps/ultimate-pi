---
name: cocoindex-search
description: "Semantic code search using CocoIndex Code (ccc). Use when exploring codebases, finding related implementation by meaning, or replacing legacy ck-search. Triggers on: semantic code search, ccc, cocoindex, cocoindex-code, find code related to, search the codebase for implementation, /skill:ck-search."
---

# cocoindex-search

CocoIndex Code (`ccc`) provides offline, AST-aware semantic search over the project codebase.

## Quick start

```bash
ccc search --limit 10 "harness subagent policy"
ccc status
```

## Full reference

Load the vendored skill: **`/skill:ccc`** (`.pi/skills/ccc/SKILL.md`).

## Harness lanes

| Question type | Tool |
|---------------|------|
| Callers, callees, cross-module paths | `graphify explain` / `graphify path` |
| Implementation by meaning | `ccc search --limit N "…"` |
| Structural patterns | `sg -p '…'` |

## Setup

```bash
bash "$UP_PKG/.pi/scripts/harness-cocoindex-bootstrap.sh"
```

Indexing before harness scouts is automatic — do not run `ccc index` or `ccc search --refresh` in `scout-semantic`.
