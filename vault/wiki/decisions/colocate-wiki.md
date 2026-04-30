---
type: decision
status: active
priority: 2
date: "2026-04-28"
owner: "aryaniyaps"
due_date: ""
context: "Should the architecture wiki be co-located in the same repository as the application source code?"
tags: [decision, architecture, documentation]
created: "2026-04-28"
updated: "2026-04-28"
title: "Co-locating Wiki with Codebase"
---
# Co-locating Wiki with Codebase

## Context
Deciding whether to store the codebase map and architecture wiki inside the source repository or in a separate documentation vault.

## Options Considered
1. **Co-location (Monorepo approach)**: Wiki lives in `wiki/` and `CLAUDE.md` in the root.
2. **Separate Vault**: Codebase is purely code; wiki is an isolated Obsidian vault elsewhere.

## Decision
**Option 1: Co-location.**

## Rationale
- **Proximity**: Developers can update code and architecture documentation in the same commit, preventing the wiki from becoming stale (the "doc rot" problem).
- **Tooling Integration**: Agent skills (`wiki`, `wiki-ingest`) can seamlessly traverse the codebase and cross-reference real files because they share the same filesystem context.
- **Git as Single Source of Truth**: Branching, PR reviews, and versioning apply to code and its architectural reasoning simultaneously.

## Consequences
- The repository clone size slightly increases (markdown is negligible, but attachments/images could add up).
- Non-code contributors (if any) need git access to update documentation.
- We must enforce policies (e.g., `.gitignore` rules or pre-commit hooks) so that generated wiki artifacts don't interfere with the build process.
