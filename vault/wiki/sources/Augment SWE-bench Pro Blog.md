---
type: source
status: ingested
source_type: blog-post
author: Arash (AJ) Joobandi, Augment Code
date_published: 2026-02-04
url: https://www.augmentcode.com/blog/auggie-tops-swe-bench-pro
confidence: high
key_claims:
  - "Auggie scored 51.80% on SWE-bench Pro, highest of any agent tested"
  - "Same model (Claude Opus 4.5), different results: Auggie 51.80%, Cursor 50.21%, Claude Code 49.75%"
  - "Auggie beat SWE-Agent baseline (45.89%) by nearly 6 points with same model"
  - "Context retrieval quality is the difference, not model intelligence"
  - "SWE-bench Pro problems require multi-file understanding (avg 4.1 files, 107 lines changed)"
tags:
  - swe-bench-pro
  - augment-code
  - benchmark
  - context-engine
created: 2026-05-02
updated: 2026-05-02

---# Auggie Tops SWE-Bench Pro (Official Blog)

## Summary

Augment Code ran their agent (Auggie) on Scale AI's SWE-bench Pro benchmark and scored 51.80%, the highest among all tested agents. Crucially, Auggie, Cursor, and Claude Code all used the same underlying model (Claude Opus 4.5), yet Auggie solved 15-17 more problems out of 731.

## Benchmark Results

| Agent | Model | Score |
|-------|-------|-------|
| Auggie | Claude Opus 4.5 | 51.80% |
| Cursor | Claude Opus 4.5 | 50.21% |
| Claude Code | Claude Opus 4.5 | 49.75% |
| Codex | GPT-5.2-codex | 46.47% |
| SWE-Agent | Claude Opus 4.5 (Scale baseline) | 45.89% |

## Key Insight: Context > Model Intelligence

The gap between agents using the same model comes from **context retrieval quality**. SWE-bench Pro problems require understanding code that isn't in the immediate file. Finding the right code in a large repository is a retrieval problem.

### Example: BCrypt Handling in Ansible
- Relevant code spans several layers (high-level filters → low-level utilities).
- Grep finds top-level APIs easily but misses the actual fix location.
- Augment's Context Engine found the low-level utility because it understands semantic relationships, not just keyword matching.

## What Is SWE-bench Pro?

Released by Scale AI in late 2025 to address SWE-bench Verified saturation:
- Multi-file edits (avg 4.1 files, 107 lines changed).
- Multiple languages (Python, Go, TypeScript, JavaScript).
- Real task diversity (bug fixes, features, security, performance, UI).
- When launched, best models dropped from 70%+ to ~23%.

## Context Engine as MCP

Augment launched their Context Engine as an MCP server, making it available for any AI agent to use for codebase context retrieval.
